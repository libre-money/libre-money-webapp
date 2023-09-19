<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing a Money Transfer Record" : "Adding a Money Transfer Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-wallet v-model="recordFromWalletId" label="From Wallet (Source)"> </select-wallet>
          <q-input type="number" filled v-model="recordFromAmount" label="Source Amount" lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">{{ recordFromCurrencySign }}</div>
            </template>
          </q-input>

          <select-wallet v-model="recordToWalletId" label="To Wallet (Destination)"> </select-wallet>
          <q-input type="number" filled v-model="recordToAmount" label="Destination Amount" lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">{{ recordToCurrencySign }}</div>
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
  },

  components: {
    SelectWallet,
    SelectTag,
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    let initialDoc: Record | null = null;
    const isLoading = ref(false);

    const recordForm: Ref<QForm | null> = ref(null);

    const recordType = RecordType.MONEY_TRANSFER;

    const recordFromAmount: Ref<number> = ref(0);
    const recordFromCurrencyId: Ref<string | null> = ref(null);
    const recordFromWalletId: Ref<string | null> = ref(null);
    const recordFromCurrencySign: Ref<string | null> = ref(null);

    const recordToAmount: Ref<number> = ref(0);
    const recordToCurrencyId: Ref<string | null> = ref(null);
    const recordToWalletId: Ref<string | null> = ref(null);
    const recordToCurrencySign: Ref<string | null> = ref(null);

    const recordTagIdList: Ref<string[]> = ref([]);
    const recordNotes: Ref<string | null> = ref(null);

    if (props.existingRecordId) {
      isLoading.value = true;
      (async function () {
        isLoading.value = true;
        let res = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
        initialDoc = res;
        if (!initialDoc.moneyTransfer) {
          // TODO show error message
          return;
        }

        recordFromAmount.value = asAmount(initialDoc.moneyTransfer.fromAmount);
        recordFromCurrencyId.value = initialDoc.moneyTransfer.fromCurrencyId;
        recordFromWalletId.value = initialDoc.moneyTransfer.fromWalletId;

        recordToAmount.value = asAmount(initialDoc.moneyTransfer.toAmount);
        recordToCurrencyId.value = initialDoc.moneyTransfer.toCurrencyId;
        recordToWalletId.value = initialDoc.moneyTransfer.toWalletId;

        recordTagIdList.value = initialDoc.tagIdList;
        recordNotes.value = initialDoc.notes;

        isLoading.value = false;
      })();
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
        moneyTransfer: {
          fromAmount: asAmount(recordFromAmount.value),
          fromCurrencyId: recordFromCurrencyId.value!,
          fromWalletId: recordFromWalletId.value!,
          toAmount: asAmount(recordToAmount.value),
          toCurrencyId: recordToCurrencyId.value!,
          toWalletId: recordToWalletId.value!,
        },
      };

      if (initialDoc) {
        record = Object.assign({}, initialDoc, record);
      }

      console.debug("Saving record: ", JSON.stringify(record, null, 2));

      pouchdbService.upsertDoc(record);

      onDialogOK();
    }

    watch(recordFromWalletId, async (newWalletId: any) => {
      let wallet = await dataInferenceService.getWallet(newWalletId as string);
      let currency = await dataInferenceService.getCurrency(wallet.currencyId);
      recordFromCurrencyId.value = currency._id!;
      recordFromCurrencySign.value = currency.sign;
    });

    watch(recordToWalletId, async (newWalletId: any) => {
      let wallet = await dataInferenceService.getWallet(newWalletId as string);
      let currency = await dataInferenceService.getCurrency(wallet.currencyId);
      recordToCurrencyId.value = currency._id!;
      recordToCurrencySign.value = currency.sign;
    });

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      validators,
      recordForm,

      recordFromAmount,
      recordFromCurrencyId,
      recordFromWalletId,
      recordFromCurrencySign,
      recordToAmount,
      recordToCurrencyId,
      recordToWalletId,
      recordToCurrencySign,

      recordTagIdList,
      recordNotes,
    };
  },
};
</script>
<style scoped lang="scss">
.currency-label {
  font-size: 18px;
}
</style>
