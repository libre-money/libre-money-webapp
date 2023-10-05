<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing an Expense Record" : "Adding an Expense Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-expense-avenue v-model="recordExpenseAvenueId"></select-expense-avenue>
          <q-input type="number" filled v-model="recordAmount" label="Expense Amount" lazy-rules :rules="validators.balance" />
          <select-currency v-model="recordCurrencyId"></select-currency>

          <q-tabs v-model="paymentType" inline-label class="bg-grey text-white shadow-2 std-margin-bottom-32">
            <q-tab name="full" label="Paid" />
            <q-tab name="partial" label="Partially Paid" />
            <q-tab name="unpaid" label="Unpaid" />
          </q-tabs>

          <select-wallet v-model="recordWalletId" v-if="paymentType == 'full' || paymentType == 'partial'"> </select-wallet>
          <q-input type="number" filled v-model="recordAmountPaid" label="Amount Paid" lazy-rules :rules="validators.balance" v-if="paymentType == 'partial'" />
          <div v-if="paymentType == 'partial'">Amount remaining: {{ recordAmountUnpaid }}</div>

          <select-party v-model="recordPartyId" :mandatory="paymentType == 'unpaid' || paymentType == 'partial'"></select-party>
          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input type="textarea" filled v-model="recordNotes" label="Notes" lazy-rules :rules="validators.notes" />
          <date-time-input v-model="transactionEpoch" label="Date & Time"></date-time-input>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end bottom-action-row">
        <q-btn color="secondary" label="Save as template" @click="saveAsTemplateClicked" />
        <div class="spacer"></div>
        <q-btn color="primary" label="Save" @click="okClicked" />
        <q-btn color="warning" label="Cancel" @click="cancelClicked" />
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
import { dialogService } from "src/services/dialog-service";
import { asAmount } from "src/utils/misc-utils";
import DateTimeInput from "./lib/DateTimeInput.vue";

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

    let initialDoc: Record | null = null;
    const isLoading = ref(false);

    const recordForm: Ref<QForm | null> = ref(null);

    const paymentType: Ref<string | null> = ref("full");
    const recordType = RecordType.EXPENSE;

    const recordExpenseAvenueId: Ref<string | null> = ref(null);
    const recordAmount: Ref<number> = ref(0);
    const recordCurrencyId: Ref<string | null> = ref(null);
    const recordPartyId: Ref<string | null> = ref(null);
    const recordWalletId: Ref<string | null> = ref(null);
    const recordAmountPaid: Ref<number> = ref(0);
    const recordAmountUnpaid: Ref<number> = ref(0);
    const recordTagIdList: Ref<string[]> = ref([]);
    const recordNotes: Ref<string | null> = ref(null);

    const transactionEpoch: Ref<number> = ref(Date.now());

    if (props.existingRecordId) {
      isLoading.value = true;
      (async function () {
        isLoading.value = true;
        let res = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
        initialDoc = res;
        if (!initialDoc.expense) {
          // TODO show error message
          return;
        }

        recordExpenseAvenueId.value = initialDoc.expense.expenseAvenueId;
        recordAmount.value = asAmount(initialDoc.expense.amount);

        recordCurrencyId.value = initialDoc.expense.currencyId;
        recordPartyId.value = initialDoc.expense.partyId;
        recordWalletId.value = initialDoc.expense.walletId;
        recordAmountPaid.value = initialDoc.expense.amountPaid;
        recordAmountUnpaid.value = initialDoc.expense.amountUnpaid;
        recordTagIdList.value = initialDoc.tagIdList;
        recordNotes.value = initialDoc.notes;

        if (initialDoc.expense.amount === initialDoc.expense.amountPaid) {
          paymentType.value = "full";
        } else if (initialDoc.expense.amountPaid === 0) {
          paymentType.value = "unpaid";
        } else {
          paymentType.value = "partial";
        }

        transactionEpoch.value = initialDoc.transactionEpoch || Date.now();

        isLoading.value = false;
      })();
    } else if (props.useTemplateId) {
      isLoading.value = true;
      (async function () {
        isLoading.value = true;
        let templateDoc = (await pouchdbService.getDocById(props.useTemplateId)) as Record;

        if (!templateDoc.expense) {
          // TODO show error message
          return;
        }

        if (templateDoc.expense.expenseAvenueId) {
          recordExpenseAvenueId.value = templateDoc.expense.expenseAvenueId;
        }
        if (templateDoc.expense.currencyId) {
          recordCurrencyId.value = templateDoc.expense.currencyId;
        }
        if (templateDoc.expense.partyId) {
          recordPartyId.value = templateDoc.expense.partyId;
        }
        if (templateDoc.expense.walletId) {
          recordWalletId.value = templateDoc.expense.walletId;
        }
        recordAmount.value = asAmount(templateDoc.expense.amount);
        recordAmountPaid.value = asAmount(templateDoc.expense.amountPaid);
        recordAmountUnpaid.value = asAmount(templateDoc.expense.amountUnpaid);
        recordTagIdList.value = templateDoc.tagIdList;
        recordNotes.value = templateDoc.notes;

        if (templateDoc.expense.amount === templateDoc.expense.amountPaid) {
          paymentType.value = "full";
        } else if (templateDoc.expense.amountPaid === 0) {
          paymentType.value = "unpaid";
        } else {
          paymentType.value = "partial";
        }

        transactionEpoch.value = Date.now();

        isLoading.value = false;
      })();
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
      $q.dialog({
        title: "Saving as template",
        message: "Provide a unique name for the template",
        prompt: {
          model: "",
          type: "text",
        },
        cancel: true,
        persistent: true,
      }).onOk((templateName: string) => {
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
      });
    }

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
    };
  },
};
</script>
<style scoped lang="scss">
.bottom-action-row {
  margin-left: 26px;
  margin-right: 26px;
  margin-bottom: 26px;
}
</style>
