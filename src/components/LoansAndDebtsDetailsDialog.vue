<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink row items-center justify-between">
        <div class="std-dialog-title text-primary text-weight-bold">Loan and Debt Summary</div>
        <q-btn flat round dense icon="close" @click="okClicked" />
      </q-card-section>
      <q-separator />
      <q-card-section v-if="recordSummary" class="col scroll" style="min-height: 0">
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
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar";
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

const $q = useQuasar();

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
</script>
<style scoped lang="scss">
.key {
  margin-right: 8px;
}

.dialog-card {
  margin-left: 16px;
}
</style>
