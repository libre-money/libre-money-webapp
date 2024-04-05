<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing an Income Record" : "Adding an Income Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-income-source v-model="recordIncomeSourceId"></select-income-source>
          <q-input type="number" filled v-model="recordAmount" label="Income Amount" lazy-rules
            :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">{{ recordCurrencySign }}</div>
            </template>
          </q-input>
          <select-currency v-model="recordCurrencyId"></select-currency>

          <q-tabs v-model="paymentType" inline-label class="bg-grey text-white shadow-2 std-margin-bottom-32">
            <q-tab name="full" label="Paid" />
            <q-tab name="partial" label="Partially Paid" />
            <q-tab name="unpaid" label="Unpaid" />
          </q-tabs>

          <select-wallet v-model="recordWalletId" v-if="paymentType == 'full' || paymentType == 'partial'"
            :limitByCurrencyId="recordCurrencyId">
          </select-wallet>
          <q-input type="number" filled v-model="recordAmountPaid" label="Amount Paid" lazy-rules
            :rules="validators.balance" v-if="paymentType == 'partial'" />
          <div v-if="paymentType == 'partial'">Amount remaining: {{ recordAmountUnpaid }}</div>

          <select-party v-model="recordPartyId"
            :mandatory="paymentType == 'unpaid' || paymentType == 'partial'"></select-party>
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
import SelectCurrency from "./SelectCurrency.vue";
import SelectIncomeSource from "./SelectIncomeSource.vue";
import SelectWallet from "./SelectWallet.vue";
import SelectParty from "./SelectParty.vue";
import SelectTag from "./SelectTag.vue";
import { NotificationType, dialogService } from "src/services/dialog-service";
import { asAmount, deepClone } from "src/utils/misc-utils";
import DateTimeInput from "./lib/DateTimeInput.vue";
import { dataInferenceService } from "src/services/data-inference-service";
import { useSettingsStore } from "src/stores/settings";

export default {
  props: {
    existingRecordId: {
      type: String,
      required: false,
      default: null,
    },
    useTemplateId: {
      type: String,
      required: false,
      default: null,
    },
  },

  components: {
    SelectCurrency,
    SelectIncomeSource,
    SelectWallet,
    SelectParty,
    SelectTag,
    DateTimeInput,
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    const settingsStore = useSettingsStore();

    let initialDoc: Record | null = null;
    const isLoading = ref(false);

    const recordForm: Ref<QForm | null> = ref(null);

    const paymentType: Ref<string | null> = ref("full");
    const recordType = RecordType.INCOME;

    const recordIncomeSourceId: Ref<string | null> = ref(null);
    const recordAmount: Ref<number> = ref(0);
    const recordCurrencyId: Ref<string | null> = ref(null);
    const recordCurrencySign: Ref<string | null> = ref(null);
    const recordPartyId: Ref<string | null> = ref(null);
    const recordWalletId: Ref<string | null> = ref(null);
    const recordAmountPaid: Ref<number> = ref(0);
    const recordAmountUnpaid: Ref<number> = ref(0);
    const recordTagIdList: Ref<string[]> = ref([]);
    const recordNotes: Ref<string | null> = ref(null);

    const transactionEpoch: Ref<number> = ref(Date.now());

    async function prefillRecord(prefilledRecord: Record): Promise<boolean> {
      console.debug("Applying prefilled record: ", prefilledRecord);
      if (!prefilledRecord || !prefilledRecord.income) {
        await dialogService.alert("Error", "Invalid Record");
        onDialogCancel();
        return false;
      }

      recordIncomeSourceId.value = prefilledRecord.income.incomeSourceId;
      recordAmount.value = asAmount(prefilledRecord.income.amount);

      recordCurrencyId.value = prefilledRecord.income.currencyId;
      recordPartyId.value = prefilledRecord.income.partyId;
      recordWalletId.value = prefilledRecord.income.walletId!;
      recordAmountPaid.value = prefilledRecord.income.amountPaid;
      recordAmountUnpaid.value = prefilledRecord.income.amountUnpaid;
      recordTagIdList.value = prefilledRecord.tagIdList;
      recordNotes.value = prefilledRecord.notes;

      if (prefilledRecord.income.amount === prefilledRecord.income.amountPaid) {
        paymentType.value = "full";
      } else if (prefilledRecord.income.amountPaid === 0) {
        paymentType.value = "unpaid";
      } else {
        paymentType.value = "partial";
      }

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
    } else {
      setTimeout(() => {
        recordCurrencyId.value = settingsStore.defaultCurrencyId;
      }, 0);
    }

    async function performManualValidation() {
      if (paymentType.value === "partial" || paymentType.value === "unpaid") {
        if (!recordPartyId.value) {
          await dialogService.alert("Error", "For partially paid and unpaid incomes, Party is required.");
          return false;
        }
      }

      if (paymentType.value === "unpaid") {
        recordWalletId.value = null;
      }

      if (paymentType.value === "full") {
        recordAmountPaid.value = recordAmount.value;
        recordAmountUnpaid.value = 0;
      }

      recordAmountPaid.value = Math.min(recordAmountPaid.value, recordAmount.value);

      recordAmountUnpaid.value = recordAmount.value - recordAmountPaid.value;

      return true;
    }

    function populatePartialRecord() {
      let record: Record = {
        $collection: "INVALID",
        notes: recordNotes.value!,
        type: recordType,
        tagIdList: recordTagIdList.value,
        transactionEpoch: transactionEpoch.value,
        income: {
          incomeSourceId: recordIncomeSourceId.value!,
          amount: asAmount(recordAmount.value),
          currencyId: recordCurrencyId.value!,
          partyId: recordPartyId.value,
          walletId: recordWalletId.value!,
          amountPaid: asAmount(recordAmountPaid.value),
          amountUnpaid: asAmount(recordAmountUnpaid.value),
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

    watch(recordCurrencyId, async (newCurrencyId: any) => {
      let currency = await dataInferenceService.getCurrency(newCurrencyId);
      recordCurrencySign.value = currency.sign;
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
      paymentType,
      recordIncomeSourceId,
      recordAmount,
      recordCurrencyId,
      recordPartyId,
      recordWalletId,
      recordCurrencySign,
      recordAmountPaid,
      recordAmountUnpaid,
      recordTagIdList,
      recordNotes,
      saveAsTemplateClicked,
    };
  },
};
</script>
<style scoped lang="scss"></style>
