<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section v-if="recordSummary">
        <div class="std-dialog-title q-pa-md">Loan and Debt Summary</div>
        <div class="dialog-card">
          <div>
            <span class="key">Party/Vendor:</span>
            <span class="value">{{ recordSummary.partyName }}</span>
          </div>
          <div>
            <span class="key">Receivables (Income):</span>
            <span class="value">{{ printAmount(recordSummary.incomeReceivable) }}</span>
          </div>
          <div>
            <span class="key">Receivables (Sales):</span>
            <span class="value">{{ printAmount(recordSummary.salesReceivable) }}</span>
          </div>
          <div>
            <span class="key">Payables (Expense):</span>
            <span class="value">{{ printAmount(recordSummary.expensePayable) }}</span>
          </div>
          <div>
            <span class="key">Payables (Purchase):</span>
            <span class="value">{{ printAmount(recordSummary.purchasePayable) }}</span>
          </div>
          <div>
            <span class="key">Total loans given by you:</span>
            <span class="value">{{ printAmount(recordSummary.totalLoansGivenToParty) }}</span>
          </div>
          <div>
            <span class="key">Total loans taken by you:</span>
            <span class="value">{{ printAmount(recordSummary.totalLoansTakenFromParty) }}</span>
          </div>
          <div>
            <span class="key">Total repaid by you:</span>
            <span class="value">{{ printAmount(recordSummary.totalRepaidToParty) }}</span>
          </div>
          <div>
            <span class="key">Total repaid to you:</span>
            <span class="value">{{ printAmount(recordSummary.totalRepaidByParty) }}</span>
          </div>
          <div>
            <span class="key">You owe them:</span>
            <span class="value">{{ printAmount(recordSummary.totalOwedToParty) }}</span>
          </div>
          <div>
            <span class="key">They owe you:</span>
            <span class="value">{{ printAmount(recordSummary.totalOwedByParty) }}</span>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Close" @click="cancelClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar";
import { LoanAndDebtSummary } from "src/models/inferred/loan-and-debt-summary";
import { printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import { ref, Ref } from "vue";

// Props
const props = defineProps<{
  summary?: LoanAndDebtSummary | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// State
const isLoading = ref(false);
const recordSummary: Ref<LoanAndDebtSummary | null> = ref(null);

// Initialize recordSummary
isLoading.value = true;
if (props.summary) {
  recordSummary.value = props.summary as LoanAndDebtSummary;
}
isLoading.value = false;

// Methods
function printAmount(amount: number) {
  return printAmountUtil(amount, recordSummary.value?.currencyId);
}

function okClicked() {
  onDialogOK();
}

const cancelClicked = onDialogCancel;
</script>
<style scoped lang="scss">
.key {
  margin-right: 8px;
}

.dialog-card {
  margin-left: 16px;
}
</style>
