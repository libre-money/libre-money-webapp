<template>
  <q-page class="items-center justify-evenly page">
    <q-card class="std-card">
      <div class="filter-row q-pa-md q-gutter-sm" v-if="!isLoading" style="display: none">
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

    <q-card class="std-card" v-if="!isLoading && budgetList.length > 0">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Budgets (Active)</div>
      </div>

      <div class="q-pa-md">
        <table class="overview-table">
          <tbody>
            <tr>
              <th>Budget</th>
              <th>Used</th>
              <th>Details</th>
            </tr>
            <tr v-for="row in budgetList" v-bind:key="row._id">
              <td>{{ row.name }}</td>
              <td>{{ printUsedPercentage(row) }}</td>
              <td>{{ printAmount(row._usedAmount) }} / {{ printAmount(row.overflowLimit) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && overview">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Expenses (Current Month)</div>
      </div>

      <div class="q-pa-md">
        <table class="overview-table">
          <tbody>
            <tr>
              <th>Expense Avenue</th>
              <th>Sum</th>
            </tr>
            <tr v-for="row in overview.expense.list" v-bind:key="row.expenseAvenueId">
              <td>{{ row.expenseAvenue.name }}</td>
              <td>{{ printAmount(row.sum) }}</td>
            </tr>
            <tr>
              <th>Grand Total</th>
              <th>{{ printAmount(overview.expense.grandSum) }}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && overview">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Wallet Balances</div>
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

    <br />
    <div style="min-height: 120px; min-width: 300px; display: block"></div>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import SelectCurrency from "src/components/SelectCurrency.vue";
import DateInput from "src/components/lib/DateInput.vue";
import { Collection } from "src/constants/constants";
import { Budget } from "src/models/budget";
import { Overview } from "src/models/inferred/overview";
import { Record } from "src/models/record";
import { computationService } from "src/services/computation-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { setDateToTheFirstDateOfMonth } from "src/utils/date-utils";
import { asAmount, prettifyAmount } from "src/utils/misc-utils";

import { Ref, ref, watch } from "vue";

const $q = useQuasar();

// ----- Refs

const recordCurrencyId: Ref<string | null> = ref(null);

const startEpoch: Ref<number> = ref(setDateToTheFirstDateOfMonth(Date.now()));
const endEpoch: Ref<number> = ref(Date.now());
const overview: Ref<Overview | null> = ref(null);
const budgetList: Ref<Budget[]> = ref([]);

const isLoading = ref(false);

// ----- Functions

async function loadData() {
  isLoading.value = true;

  let newOverview = await computationService.computeOverview(startEpoch.value, endEpoch.value, recordCurrencyId.value!);
  overview.value = newOverview;

  let res = await pouchdbService.listByCollection(Collection.BUDGET);
  let newBudgetList = res.docs as Budget[];
  newBudgetList = newBudgetList.filter((budget) => budget.currencyId === recordCurrencyId.value!);
  await computationService.computeUsedAmountForBudgetListInPlace(newBudgetList);
  budgetList.value = newBudgetList;

  isLoading.value = false;
}

// ----- Event Handlers

async function submitClicked() {
  loadData();
}

// ----- Computed and Embedded

function printAmount(amount: number) {
  return `${overview.value?.currency.sign} ${prettifyAmount(amount)}`;
}

function printUsedPercentage(budget: Budget) {
  if (budget.overflowLimit <= 0) {
    return "-";
  }
  return `${Math.round((budget._usedAmount / budget.overflowLimit) * 10000) / 100}%`;
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
