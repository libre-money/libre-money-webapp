<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss full-width>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">Adding Expenses (Bulk)</div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <template v-for="(entry, index) in bulkExpenseEntryList" :key="index">
            <div class="row q-gutter-sm justify-between items-baseline" style="flex-wrap: nowrap; white-space: nowrap; overflow-x: auto; margin-top: -12px">
              <q-btn round dense icon="delete" color="grey-7" @click="removeEntry(index)" />
              <date-input v-model="entry.transactionEpoch" label="Date & Time"></date-input>
              <select-expense-avenue v-model="entry.expenseAvenueId"></select-expense-avenue>
              <select-currency v-model="entry.currencyId"></select-currency>
              <q-input
                type="number"
                filled
                v-model="entry.amount"
                label="Expense Amount"
                lazy-rules
                :rules="validators.balance"
                style="min-width: 160px"
              ></q-input>
              <select-wallet v-model="entry.walletId" :limitByCurrencyId="entry.currencyId"></select-wallet>
              <q-input
                type="number"
                filled
                v-model="entry.amountUnpaid"
                label="Amount Unpaid"
                lazy-rules
                :rules="validators.balance"
                placeholder="0"
                style="min-width: 160px"
              ></q-input>
              <select-party v-model="entry.partyId" :mandatory="false"></select-party>
              <q-btn round dense icon="content_copy" color="grey-7" @click="bulkExpenseEntryList.push({ ...entry })" />
              <q-btn round dense icon="add" color="grey-7" @click="addEmptyEntry()" />
            </div>
          </template>

          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input type="textarea" filled v-model="recordNotes" label="Notes" lazy-rules :rules="validators.notes" />
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-start std-bottom-action-row">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <div class="spacer"></div>
        <q-btn size="md" color="primary" label="Save" @click="okClicked" style="margin-left: 8px" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { QForm, useDialogPluginComponent, useQuasar } from "quasar";
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/models/record";
import { dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { useSettingsStore } from "src/stores/settings";
import { asAmount } from "src/utils/misc-utils";
import { validators } from "src/utils/validators";
import { Ref, ref } from "vue";
import DateInput from "./lib/DateInput.vue";
import SelectCurrency from "./SelectCurrency.vue";
import SelectExpenseAvenue from "./SelectExpenseAvenue.vue";
import SelectParty from "./SelectParty.vue";
import SelectTag from "./SelectTag.vue";
import SelectWallet from "./SelectWallet.vue";

type BulkExpenseEntry = {
  expenseAvenueId: string | null;
  amount: number;
  currencyId: string | null;
  partyId: string | null;
  walletId: string | null;
  amountUnpaid: number;
  transactionEpoch: number;
};

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
    suggestedWalletId: {
      type: String,
      required: false,
      default: null,
    },
    suggestedCurrencyId: {
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
    DateInput,
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    const $q = useQuasar();
    const settingsStore = useSettingsStore();

    const isLoading = ref(false);

    const recordForm: Ref<QForm | null> = ref(null);

    const recordType = RecordType.EXPENSE;

    const recordTagIdList: Ref<string[]> = ref([]);
    const recordNotes: Ref<string | null> = ref(null);

    const bulkExpenseEntryList: Ref<BulkExpenseEntry[]> = ref([]);

    async function addEmptyEntry() {
      bulkExpenseEntryList.value.push({
        expenseAvenueId: null,
        amount: 0,
        currencyId: props.suggestedCurrencyId || null,
        partyId: null,
        walletId: props.suggestedWalletId || null,
        amountUnpaid: 0,
        transactionEpoch: Date.now(),
      });
    }

    async function addPrefilledEntry(prefilledRecord: Record): Promise<boolean> {
      console.debug("Applying prefilled record: ", prefilledRecord);
      if (!prefilledRecord || !prefilledRecord.expense) {
        await dialogService.alert("Error", "Invalid Record");
        onDialogCancel();
        return false;
      }

      await addEmptyEntry();

      if (prefilledRecord.expense.expenseAvenueId) {
        bulkExpenseEntryList.value[0].expenseAvenueId = prefilledRecord.expense.expenseAvenueId;
      }
      if (prefilledRecord.expense.currencyId) {
        bulkExpenseEntryList.value[0].currencyId = prefilledRecord.expense.currencyId;
      }
      if (prefilledRecord.expense.partyId) {
        bulkExpenseEntryList.value[0].partyId = prefilledRecord.expense.partyId;
      }
      if (prefilledRecord.expense.walletId) {
        bulkExpenseEntryList.value[0].walletId = prefilledRecord.expense.walletId;
      }
      bulkExpenseEntryList.value[0].amount = asAmount(prefilledRecord.expense.amount);
      bulkExpenseEntryList.value[0].amountUnpaid = asAmount(prefilledRecord.expense.amountUnpaid);
      recordTagIdList.value = prefilledRecord.tagIdList;
      recordNotes.value = prefilledRecord.notes;

      return true;
    }

    if (props.existingRecordId) {
      isLoading.value = true;
      (async function () {
        isLoading.value = true;
        const initialDoc = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
        if (!(await addPrefilledEntry(initialDoc))) return;
        isLoading.value = false;
      })();
    } else if (props.useTemplateId) {
      isLoading.value = true;
      (async function () {
        isLoading.value = true;
        const templateDoc = (await pouchdbService.getDocById(props.useTemplateId)) as Record;
        if (!(await addPrefilledEntry(templateDoc))) return;
        isLoading.value = false;
      })();
    } else {
      (async function () {
        isLoading.value = true;
        await addEmptyEntry();
        isLoading.value = false;
      })();
    }

    async function performManualValidation() {
      for (const [index, entry] of bulkExpenseEntryList.value.entries()) {
        if (entry.amount < 0) {
          await dialogService.alert("Error", `For entry ${index + 1}, amount cannot be negative`);
          return false;
        }
        if (entry.amountUnpaid < 0) {
          await dialogService.alert("Error", `For entry ${index + 1}, amount unpaid cannot be negative`);
          return false;
        }
        if (entry.amountUnpaid > entry.amount) {
          await dialogService.alert("Error", `For entry ${index + 1}, amount unpaid cannot be greater than amount`);
          return false;
        }
      }

      return true;
    }

    async function insertExpense(entry: BulkExpenseEntry) {
      let record: Record = {
        $collection: Collection.RECORD,
        notes: recordNotes.value!,
        type: recordType,
        tagIdList: recordTagIdList.value,
        transactionEpoch: entry.transactionEpoch,
        expense: {
          expenseAvenueId: entry.expenseAvenueId!,
          amount: asAmount(entry.amount),
          currencyId: entry.currencyId!,
          partyId: entry.partyId!,
          walletId: entry.walletId!,
          amountPaid: asAmount(entry.amount) - asAmount(entry.amountUnpaid),
          amountUnpaid: asAmount(entry.amountUnpaid),
        },
      };

      return await pouchdbService.upsertDoc(record);
    }

    async function okClicked() {
      if (!(await recordForm.value?.validate())) return;
      if (!(await performManualValidation())) return;

      // Create a copy of the list since we'll be modifying it while iterating
      const entries = [...bulkExpenseEntryList.value];
      for (const entry of entries) {
        try {
          await insertExpense(entry);
          // Remove the successfully inserted entry
          const index = bulkExpenseEntryList.value.indexOf(entry);
          if (index > -1) {
            bulkExpenseEntryList.value.splice(index, 1);
          }
        } catch (error) {
          await dialogService.alert("Error", `Error inserting expense: ${error}`);
          return false;
        }

        onDialogOK();
      }
    }

    function removeEntry(index: number) {
      bulkExpenseEntryList.value.splice(index, 1);
      if (bulkExpenseEntryList.value.length === 0) {
        addEmptyEntry();
      }
    }

    return {
      removeEntry,
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      validators,
      recordForm,
      recordTagIdList,
      recordNotes,
      bulkExpenseEntryList,
      addEmptyEntry,
    };
  },
};
</script>
<style scoped lang="scss">
.wallet-balance-container {
  color: #546e7a;
  margin-top: -16px;
  margin-bottom: 12px;
  text-align: right;

  .wallet-limit-normal {
    color: #546e7a;
  }

  .wallet-limit-warning {
    color: #546e7a;
    border-bottom: 4px solid #ffd740;
  }

  .wallet-limit-exceeded {
    color: #bf360c;
  }
}
</style>
