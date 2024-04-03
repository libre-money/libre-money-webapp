<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing an Expense Record" : "Adding an Expense Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-expense-avenue v-model="recordExpenseAvenueId"></select-expense-avenue>
          <q-input type="number" filled v-model="recordAmount" label="Expense Amount" lazy-rules
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
import { QForm, useDialogPluginComponent, useQuasar } from "quasar";
import { Ref, ref, watch } from "vue";
import { validators } from "src/utils/validators";
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/models/record";
import { pouchdbService } from "src/services/pouchdb-service";
import SelectCurrency from "./SelectCurrency.vue";
import SelectExpenseAvenue from "./SelectExpenseAvenue.vue";
import SelectWallet from "./SelectWallet.vue";
import SelectParty from "./SelectParty.vue";
import SelectTag from "./SelectTag.vue";
import { NotificationType, dialogService } from "src/services/dialog-service";
import { asAmount } from "src/utils/misc-utils";
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
    SelectExpenseAvenue,
    SelectWallet,
    SelectParty,
    SelectTag,
    DateTimeInput,
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    const $q = useQuasar();
    const settingsStore = useSettingsStore();

    let initialDoc: Record | null = null;
    const isLoading = ref(false);

    const recordForm: Ref<QForm | null> = ref(null);

    const paymentType: Ref<string | null> = ref("full");
    const recordType = RecordType.EXPENSE;

    const recordExpenseAvenueId: Ref<string | null> = ref(null);
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
      if (!prefilledRecord || !prefilledRecord.expense) {
        await dialogService.alert("Error", "Invalid Record");
        onDialogCancel();
        return false;
      }

      if (prefilledRecord.expense.expenseAvenueId) {
        recordExpenseAvenueId.value = prefilledRecord.expense.expenseAvenueId;
      }
      if (prefilledRecord.expense.currencyId) {
        recordCurrencyId.value = prefilledRecord.expense.currencyId;
      }
      if (prefilledRecord.expense.partyId) {
        recordPartyId.value = prefilledRecord.expense.partyId;
      }
      if (prefilledRecord.expense.walletId) {
        recordWalletId.value = prefilledRecord.expense.walletId;
      }
      recordAmount.value = asAmount(prefilledRecord.expense.amount);
      recordAmountPaid.value = asAmount(prefilledRecord.expense.amountPaid);
      recordAmountUnpaid.value = asAmount(prefilledRecord.expense.amountUnpaid);
      recordTagIdList.value = prefilledRecord.tagIdList;
      recordNotes.value = prefilledRecord.notes;

      if (prefilledRecord.expense.amount === prefilledRecord.expense.amountPaid) {
        paymentType.value = "full";
      } else if (prefilledRecord.expense.amountPaid === 0) {
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
          await dialogService.alert("Error", "For partially paid and unpaid expenses, Party is required.");
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
        transactionEpoch: transactionEpoch.value,
        expense: {
          expenseAvenueId: recordExpenseAvenueId.value!,
          amount: asAmount(recordAmount.value),
          currencyId: recordCurrencyId.value!,
          partyId: recordPartyId.value,
          walletId: recordWalletId.value!,
          amountPaid: asAmount(recordAmountPaid.value),
          amountUnpaid: asAmount(recordAmountUnpaid.value),
        },
      };

      if (initialDoc) {
        record = Object.assign({}, initialDoc, record);
      }

      console.debug("Saving record: ", JSON.stringify(record, null, 2));

      pouchdbService.upsertDoc(record);

      onDialogOK();
    }

    async function saveAsTemplateClicked() {
      let templateName = await dialogService.prompt("Saving as template", "Provide a unique name for the template", "");
      if (!templateName) return;
      let partialRecord: Record = {
        $collection: Collection.RECORD_TEMPLATE,
        templateName,
        notes: recordNotes.value!,
        type: recordType,
        tagIdList: recordTagIdList.value,
        transactionEpoch: transactionEpoch.value,
        expense: {
          expenseAvenueId: recordExpenseAvenueId.value!,
          amount: asAmount(recordAmount.value),
          currencyId: recordCurrencyId.value!,
          partyId: recordPartyId.value,
          walletId: recordWalletId.value!,
          amountPaid: asAmount(recordAmountPaid.value),
          amountUnpaid: asAmount(recordAmountUnpaid.value),
        },
      };
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
      saveAsTemplateClicked,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      validators,
      transactionEpoch,
      recordForm,
      paymentType,
      recordExpenseAvenueId,
      recordAmount,
      recordCurrencyId,
      recordPartyId,
      recordWalletId,
      recordAmountPaid,
      recordAmountUnpaid,
      recordTagIdList,
      recordNotes,
      recordCurrencySign,
    };
  },
};
</script>
<style scoped lang="scss"></style>
