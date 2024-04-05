<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing a Money Transfer Record" : "Adding a Money Transfer Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-wallet v-model="recordFromWalletId" label="From Wallet (Source)"> </select-wallet>
          <q-input type="number" filled v-model="recordFromAmount" label="Source Amount" lazy-rules
            :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">{{ recordFromCurrencySign }}</div>
            </template>
          </q-input>

          <select-wallet v-model="recordToWalletId" label="To Wallet (Destination)"> </select-wallet>
          <q-input type="number" filled v-model="recordToAmount" label="Destination Amount" lazy-rules
            :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">{{ recordToCurrencySign }}</div>
            </template>
          </q-input>

          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input type="textarea" filled v-model="recordNotes" label="Notes" lazy-rules :rules="validators.notes" />
          <date-time-input v-model="transactionEpoch" label="Date & Time"></date-time-input>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-start std-bottom-action-row">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <div class="spacer"></div>
        <q-btn-dropdown size="md" color="primary" label="Save" split @click="okClicked" style="margin-left: 8px;">
          <q-list>
            <q-item clickable v-close-popup @click="saveAsTemplateClicked">
              <q-item-section>
                <q-item-label>Save as Template</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
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
import { asAmount, deepClone } from "src/utils/misc-utils";
import { dataInferenceService } from "src/services/data-inference-service";
import DateTimeInput from "./lib/DateTimeInput.vue";
import { NotificationType, dialogService } from "src/services/dialog-service";

export default {
  props: {
    existingRecordId: {
      type: String,
      required: false,
      default: null,
      DateTimeInput,
    },
    useTemplateId: {
      type: String,
      required: false,
      default: null,
    },
  },

  components: {
    SelectWallet,
    SelectTag,
    DateTimeInput,
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

    const transactionEpoch: Ref<number> = ref(Date.now());

    async function prefillRecord(prefilledRecord: Record): Promise<boolean> {
      console.debug("Applying prefilled record: ", prefilledRecord);
      if (!prefilledRecord || !prefilledRecord.moneyTransfer) {
        await dialogService.alert("Error", "Invalid Record");
        onDialogCancel();
        return false;
      }

      recordFromAmount.value = asAmount(prefilledRecord.moneyTransfer.fromAmount);
      recordFromCurrencyId.value = prefilledRecord.moneyTransfer.fromCurrencyId;
      recordFromWalletId.value = prefilledRecord.moneyTransfer.fromWalletId;

      recordToAmount.value = asAmount(prefilledRecord.moneyTransfer.toAmount);
      recordToCurrencyId.value = prefilledRecord.moneyTransfer.toCurrencyId;
      recordToWalletId.value = prefilledRecord.moneyTransfer.toWalletId;

      recordTagIdList.value = prefilledRecord.tagIdList;
      recordNotes.value = prefilledRecord.notes;

      return true;
    }

    if (props.existingRecordId) {
      isLoading.value = true;
      (async function () {
        isLoading.value = true;
        initialDoc = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
        if (!await prefillRecord(initialDoc)) return;
        transactionEpoch.value = initialDoc.transactionEpoch || Date.now();
        isLoading.value = false;
      })();
    } else if (props.useTemplateId) {
      isLoading.value = true;
      (async function () {
        isLoading.value = true;
        let templateDoc = (await pouchdbService.getDocById(props.useTemplateId)) as Record;
        if (!await prefillRecord(templateDoc)) return;
        transactionEpoch.value = Date.now();
        isLoading.value = false;
      })();
    }

    async function performManualValidation() {
      return true;
    }


    function populatePartialRecord() {
      let record: Record = {
        $collection: "INVALID",
        notes: recordNotes.value!,
        type: recordType,
        tagIdList: recordTagIdList.value,
        transactionEpoch: transactionEpoch.value,
        moneyTransfer: {
          fromAmount: asAmount(recordFromAmount.value),
          fromCurrencyId: recordFromCurrencyId.value!,
          fromWalletId: recordFromWalletId.value!,
          toAmount: asAmount(recordToAmount.value),
          toCurrencyId: recordToCurrencyId.value!,
          toWalletId: recordToWalletId.value!,
        },
      };

      return record;
    }

    async function okClicked() {
      if (!(await recordForm.value?.validate())) return;
      if (!(await performManualValidation())) return;

      let record: Record = populatePartialRecord();
      record.$collection = Collection.RECORD;

      if (initialDoc) {
        record = Object.assign({}, initialDoc, record);
      }

      console.debug("Saving record: ", deepClone(record));
      pouchdbService.upsertDoc(record);
      onDialogOK();
    }

    async function saveAsTemplateClicked() {
      if (!(await performManualValidation())) return;

      let templateName = await dialogService.prompt("Saving as template", "Provide a unique name for the template", "");
      if (!templateName) return;

      let partialRecord: Record = populatePartialRecord();
      partialRecord.$collection = Collection.RECORD_TEMPLATE;
      partialRecord.templateName = templateName;

      console.debug("Saving record as template: ", deepClone(partialRecord));
      pouchdbService.upsertDoc(partialRecord);
      dialogService.notify(NotificationType.SUCCESS, "Template saved.");
      onDialogCancel();
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
      transactionEpoch,
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
      saveAsTemplateClicked,
    };
  },
};
</script>
<style scoped lang="scss">
.currency-label {
  font-size: 18px;
}
</style>
