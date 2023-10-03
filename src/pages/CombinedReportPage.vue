<template>
  <q-page class="items-center justify-evenly page">
    <q-card class="std-card">
      <div class="filter-row q-pa-md q-gutter-sm" v-if="!isLoading">
        <div class="title">Filters</div>
        <select-currency v-model="recordCurrencyId"></select-currency>
        <date-input v-model="startEpoch" label="Start Date"></date-input>
        <date-input v-model="endEpoch" label="End Date"></date-input>
        <q-btn color="primary" label="Submit" @click="submitClicked" />
      </div>

      <div class="q-pa-md" v-if="isLoading">
        <div class="loading-notifier">
          <q-spinner color="primary" size="32px"></q-spinner>
        </div>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && overview">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Income</div>
      </div>

      <div class="q-pa-md">
        <table class="overview-table">
          <tbody>
            <tr>
              <th>Income Source</th>
              <th>Transaction Count</th>
              <th>Sum</th>
            </tr>
            <tr v-for="row in overview.income.list" v-bind:key="row.incomeSourceId">
              <td>{{ row.incomeSource.name }}</td>
              <td>{{ printCount(row.transactionCount) }}</td>
              <td>{{ printAmount(row.sum) }}</td>
            </tr>
            <tr>
              <th>Grand Total</th>
              <th>{{ printCount(overview.income.totalTransactionCount) }}</th>
              <th>{{ printAmount(overview.income.grandSum) }}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && overview">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Expense</div>
      </div>

      <div class="q-pa-md">
        <table class="overview-table">
          <tbody>
            <tr>
              <th>Expense Avenue</th>
              <th>Transaction Count</th>
              <th>Sum</th>
            </tr>
            <tr v-for="row in overview.expense.list" v-bind:key="row.expenseAvenueId">
              <td>{{ row.expenseAvenue.name }}</td>
              <td>{{ printCount(row.transactionCount) }}</td>
              <td>{{ printAmount(row.sum) }}</td>
            </tr>
            <tr>
              <th>Grand Total</th>
              <th>{{ printCount(overview.expense.totalTransactionCount) }}</th>
              <th>{{ printAmount(overview.expense.grandSum) }}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && overview">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Wallets</div>
      </div>

      <div class="q-pa-md">
        <table class="overview-table">
          <tbody>
            <tr>
              <th>Wallet</th>
              <th>Balance</th>
            </tr>
            <tr v-for="row in overview.wallets.list" v-bind:key="row.walletId">
              <td>{{ row.wallet.name }}</td>
              <td>{{ printAmount(row.balance) }}</td>
            </tr>
            <tr>
              <th>Grand Total</th>
              <th>{{ printAmount(overview.wallets.sumOfBalances) }}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && overview">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Assets</div>
      </div>

      <div class="q-pa-md">
        <table class="overview-table">
          <tbody>
            <tr>
              <th>Asset</th>
              <th>Balance</th>
            </tr>
            <tr v-for="row in overview.assets.list" v-bind:key="row.assetId">
              <td>{{ row.asset.name }}</td>
              <td>{{ printAmount(row.balance) }}</td>
            </tr>
            <tr>
              <th>Grand Total</th>
              <th>{{ printAmount(overview.assets.sumOfBalances) }}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && overview">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Receivables (Calculated)</div>
      </div>

      <div class="q-pa-md">
        <table class="overview-table">
          <tbody>
            <tr>
              <th>Party</th>
              <th>Income Receivable</th>
              <th>Asset Sales Receivable</th>
            </tr>
            <tr v-for="row in overview.computedReceivables.list" v-bind:key="row.partyId">
              <td>{{ row.party.name }}</td>
              <td>{{ printAmount(row.incomeReceivable) }}</td>
              <td>{{ printAmount(row.salesReceivable) }}</td>
            </tr>
            <tr>
              <th>Grand Total</th>
              <th>{{ printAmount(overview.computedReceivables.totalIncomeReceivables) }}</th>
              <th>{{ printAmount(overview.computedReceivables.totalSalesReceivables) }}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && overview">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Payables (Calculated)</div>
      </div>

      <div class="q-pa-md">
        <table class="overview-table">
          <tbody>
            <tr>
              <th>Party</th>
              <th>Expense Payable</th>
              <th>Asset Purchase Payable</th>
            </tr>
            <tr v-for="row in overview.computedPayables.list" v-bind:key="row.partyId">
              <td>{{ row.party.name }}</td>
              <td>{{ printAmount(row.expensePayable) }}</td>
              <td>{{ printAmount(row.purchasePayable) }}</td>
            </tr>
            <tr>
              <th>Grand Total</th>
              <th>{{ printAmount(overview.computedPayables.totalExpensePayables) }}</th>
              <th>{{ printAmount(overview.computedPayables.totalPurchasePayables) }}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && overview">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Loans and Debts</div>
      </div>

      <div class="q-pa-md">
        <table class="overview-table">
          <tbody>
            <tr>
              <th>Party</th>
              <th>They owe you</th>
              <th>You owe them</th>
            </tr>
            <tr v-for="row in overview.loanAndDebts.list" v-bind:key="row.partyId">
              <td>{{ row.party.name }}</td>
              <td>{{ printAmount(row.theyOweUserAmount) }}</td>
              <td>{{ printAmount(row.userOwesThemAmount) }}</td>
            </tr>
            <tr>
              <th>Grand Total</th>
              <th>{{ printAmount(overview.loanAndDebts.userIsOwedTotalAmount) }}</th>
              <th>{{ printAmount(overview.loanAndDebts.userOwesTotalAmount) }}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && overview">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Final Balance</div>
      </div>

      <div class="q-pa-md">
        <table class="overview-table">
          <tbody>
            <tr>
              <th>Particular</th>
              <th>Value of Assets</th>
              <th>Liabilities</th>
            </tr>
            <tr>
              <td>Wallets (Current Assets)</td>
              <td>{{ printAmount(overview.wallets.sumOfBalances) }}</td>
              <td></td>
            </tr>
            <tr>
              <td>Assets</td>
              <td>{{ printAmount(overview.assets.sumOfBalances) }}</td>
              <td></td>
            </tr>
            <tr>
              <td>Income Receivables</td>
              <td>{{ printAmount(overview.computedReceivables.totalIncomeReceivables) }}</td>
              <td></td>
            </tr>
            <tr>
              <td>Sales Receivables</td>
              <td>{{ printAmount(overview.computedReceivables.totalSalesReceivables) }}</td>
              <td></td>
            </tr>
            <tr>
              <td>Loans (Receivables)</td>
              <td>{{ printAmount(overview.loanAndDebts.userIsOwedTotalAmount) }}</td>
              <td></td>
            </tr>
            <tr>
              <td>Expense Payables</td>
              <td></td>
              <td>{{ printAmount(overview.computedPayables.totalExpensePayables) }}</td>
            </tr>
            <tr>
              <td>Asset Purchase Payables</td>
              <td></td>
              <td>{{ printAmount(overview.computedPayables.totalPurchasePayables) }}</td>
            </tr>
            <tr>
              <td>Debt (Payables)</td>
              <td></td>
              <td>{{ printAmount(overview.loanAndDebts.userOwesTotalAmount) }}</td>
            </tr>

            <tr>
              <th>Grand Total</th>
              <th>{{ printAmount(overview.finalBalance.totalAsset) }}</th>
              <th>{{ printAmount(overview.finalBalance.totalLiability) }}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <br />
    <div style="min-height: 120px; min-width: 300px; display: block"></div>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import SelectCurrency from "src/components/SelectCurrency.vue";
import DateInput from "src/components/lib/DateInput.vue";
import { Overview } from "src/models/inferred/overview";
import { Record } from "src/models/record";
import { computationService } from "src/services/computation-service";
import { asAmount } from "src/utils/misc-utils";

import { Ref, ref, watch } from "vue";

const $q = useQuasar();

function computeStartEpoch(now: number) {
  let date = new Date(now);
  date.setDate(1);
  return date.getTime();
}

// ----- Refs

const recordCurrencyId: Ref<string | null> = ref(null);

const startEpoch: Ref<number> = ref(computeStartEpoch(Date.now()));
const endEpoch: Ref<number> = ref(Date.now());
const overview: Ref<Overview | null> = ref(null);

const isLoading = ref(false);

// ----- Functions

async function loadData() {
  isLoading.value = true;

  let newOverview = await computationService.computeOverview(startEpoch.value, endEpoch.value, recordCurrencyId.value!);
  overview.value = newOverview;
  console.log({ newOverview });

  isLoading.value = false;
}

// ----- Event Handlers

async function submitClicked() {
  loadData();
}

// ----- Computed and Embedded

function printAmount(amount: number) {
  return `${overview.value?.currency.sign} ${amount.toLocaleString("en-US")}`;
}

function printCount(count: number) {
  return `${count.toLocaleString("en-US")}`;
}

// ----- Watchers

watch(recordCurrencyId, (newValue, __) => {
  if (newValue) {
    loadData();
  }
});

// ----- Execution

// loadData();
</script>

<style scoped lang="scss">
.loading-notifier {
  width: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  justify-items: center;
  padding: 24px;
  padding-top: 0px;
}

.overview-table {
  font-family: Arial, Helvetica, sans-serif;
  border-collapse: collapse;
  width: 100%;
}

.overview-table td,
.overview-table th {
  border: 1px solid #ddd;
  padding: 8px;
}

.overview-table tr:nth-child(even) {
  background-color: #f2f2f2;
}

.overview-table tr:hover {
  background-color: #ddd;
}

.overview-table th {
  padding-top: 12px;
  padding-bottom: 12px;
  text-align: left;
  background-color: #426689;
  color: whitesmoke;
}

.filter-row {
  display: flex;
  align-items: baseline;
}

.page {
  display: flex;
  flex-direction: column;
}
</style>
