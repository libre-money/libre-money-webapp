<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing a Repayment Given Record" : "Adding a Repayment Given Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-party v-model="recordPartyId" mandatory></select-party>

          <select-wallet v-model="recordWalletId" :limitByCurrencyId="recordCurrencyId"></select-wallet>

          <div v-if="suggestedAmount">Total Owed to Party: {{ suggestedAmount }}</div>

          <q-input type="number" filled v-model="recordAmount" label="Given Amount" lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">
                {{ recordCurrencySign }}
              </div>
            </template>
          </q-input>

          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input type="textarea" filled v-model="recordNotes" label="Notes" lazy-rules :rules="validators.notes" />
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="primary" label="OK" @click="okClicked" />
        <q-btn color="primary" label="Cancel" @click="cancelClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { Ref, ref, watch } from "vue";
import { validators } from "src/utils/validators";
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/models/record";
import { pouchdbService } from "src/services/pouchdb-service";
import SelectWallet from "./SelectWallet.vue";
import SelectParty from "./SelectParty.vue";
import SelectTag from "./SelectTag.vue";
import { asAmount } from "src/utils/misc-utils";
import { dataInferenceService } from "src/services/data-inference-service";

export default {
  props: {
    existingRecordId: {
      type: String,
      required: false,
      default: null,
    },
    suggestedCurrencyId: {
      type: String,
      required: false,
      default: null,
    },
    suggestedPartyId: {
      type: String,
      required: false,
      default: null,
    },
    suggestedAmount: {
      type: Number,
      required: false,
      default: null,
    },
  },

  components: {
    SelectWallet,
    SelectParty,
    SelectTag,
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    let initialDoc: Record | null = null;
    const isLoading = ref(false);

    const recordForm: Ref<QForm | null> = ref(null);

    const paymentType: Ref<string | null> = ref("full");
    const recordType = RecordType.REPAYMENT_GIVEN;

    const recordAmount: Ref<number> = ref(0);
    const recordCurrencyId: Ref<string | null> = ref(null);
    const recordCurrencySign: Ref<string | null> = ref(null);
    const recordPartyId: Ref<string | null> = ref(null);
    const recordWalletId: Ref<string | null> = ref(null);
    const recordTagIdList: Ref<string[]> = ref([]);
    const recordNotes: Ref<string | null> = ref(null);

    if (props.existingRecordId) {
      isLoading.value = true;
      (async function () {
        isLoading.value = true;
        let res = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
        initialDoc = res;
        if (!initialDoc.repaymentGiven) {
          // TODO show error message
          return;
        }
        recordAmount.value = asAmount(initialDoc.repaymentGiven.amount);
        recordCurrencyId.value = initialDoc.repaymentGiven.currencyId;
        recordPartyId.value = initialDoc.repaymentGiven.partyId;
        recordWalletId.value = initialDoc.repaymentGiven.walletId!;

        recordTagIdList.value = initialDoc.tagIdList;
        recordNotes.value = initialDoc.notes;

        isLoading.value = false;
      })();
    } else {
      recordCurrencyId.value = props.suggestedCurrencyId!;
      recordPartyId.value = props.suggestedPartyId!;
      recordAmount.value = props.suggestedAmount!;
    }

    async function performManualValidation() {
      return true;
    }

    async function okClicked() {
      if (!(await recordForm.value?.validate())) {
        return;
      }

      if (!(await performManualValidation())) {
        return;
      }

      let record: Record = {
        $collection: Collection.RECORD,
        notes: recordNotes.value!,
        type: recordType,
        tagIdList: recordTagIdList.value,
        repaymentGiven: {
          amount: asAmount(recordAmount.value),
          walletId: recordWalletId.value!,
          currencyId: recordCurrencyId.value!,
          partyId: recordPartyId.value!,
        },
      };

      if (initialDoc) {
        record = Object.assign({}, initialDoc, record);
      }

      console.debug("Saving record: ", JSON.stringify(record, null, 2));

      pouchdbService.upsertDoc(record);

      onDialogOK();
    }

    watch(recordCurrencyId, async (currencyId: any) => {
      recordCurrencySign.value = (await dataInferenceService.getCurrency(currencyId)).sign;
    });

    watch(recordWalletId, async (newWalletId: any) => {
      let wallet = await dataInferenceService.getWallet(newWalletId as string);
      let currency = await dataInferenceService.getCurrency(wallet.currencyId);
      recordCurrencySign.value = currency.sign;
    });

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      validators,
      recordForm,
      paymentType,
      recordAmount,
      recordCurrencyId,
      recordPartyId,
      recordWalletId,
      recordCurrencySign,
      recordTagIdList,
      recordNotes,
    };
  },
};
</script>
<style scoped lang="ts"></style>
