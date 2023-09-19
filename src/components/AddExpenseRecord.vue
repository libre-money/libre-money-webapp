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
import { Ref, ref } from "vue";
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

export default {
  props: {
    existingRecordId: {
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
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

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

    if (props.existingRecordId) {
      isLoading.value = true;
      // (async function () {
      //   let res = await pouchdbService.getDocById(props.existingRecordId) as Record;
      //   initialDoc = res;
      //   recordName.value = res.name;
      //   recordType.value = res.type;
      //   recordInitialBalance.value = res.initialBalance;
      //   recordCurrencyId.value = res.currencyId;
      //   isLoading.value = false;
      // })();
    }

    async function performManualValidation() {
      if (paymentType.value === "partial" || paymentType.value === "unpaid") {
        if (!recordPartyId.value) {
          await dialogService.alert("Error", "For partially paid and unpaid expenses, Party is required.");
          return false;
        }
      }

      if (paymentType.value === "partial") {
        recordAmountUnpaid.value = recordAmount.value - recordAmountPaid.value;
      }

      if (paymentType.value === "unpaid") {
        recordWalletId.value = null;
      }

      if (paymentType.value === "full") {
        recordAmountPaid.value = recordAmount.value;
        recordAmountUnpaid.value = 0;
      }

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
        expense: {
          expenseAvenueId: recordExpenseAvenueId.value!,
          amount: recordAmount.value,
          currencyId: recordCurrencyId.value!,
          partyId: recordPartyId.value,
          walletId: recordWalletId.value!,
          amountPaid: recordAmountPaid.value,
          amountUnpaid: recordAmountUnpaid.value,
        },
      };

      if (initialDoc) {
        record = Object.assign({}, initialDoc, record);
      }

      console.debug("Saving record: ", JSON.stringify(record, null, 2));

      pouchdbService.upsertDoc(record);

      onDialogOK();
    }

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      validators,
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
<style scoped lang="ts"></style>
