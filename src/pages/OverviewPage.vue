<template>
  <q-page class="items-center page">
    <div class="q-pa-md row justify-end std-card" style="margin-right: 0; margin-bottom: -56px; width: 100%">
      <select-currency v-model="recordCurrencyId"></select-currency>
    </div>

    <q-card class="std-card">
      <div class="q-pa-md" v-if="isLoading">
        <div class="loading-notifier">
          <q-spinner color="primary" size="32px"></q-spinner>
        </div>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && !overview">
      <div class="q-pa-md q-gutter-sm">
        <div>
          Welcome to Cash Keeper!<br /><br />
          If this is your first time here, please read the <strong>Currently Imaginary</strong> getting started
          guide.<br /><br />
          If you already have some data on our servers, use the button to the top right to <strong>Sync</strong> your
          data to this device.<br /><br />
          Enjoy!
        </div>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && budgetList.length > 0">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Budgets</div>
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
              <td>{{ printAmount(row._usedAmount || 0) }} / {{ printAmount(row.overflowLimit) }}</td>
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
import { useSettingsStore } from "src/stores/settings";
import { setDateToTheFirstDateOfMonth } from "src/utils/date-utils";
import { asAmount, prettifyAmount } from "src/utils/misc-utils";

import { Ref, ref, watch } from "vue";
import debounceAsync from "src/utils/debounce";

const $q = useQuasar();
const settingsStore = useSettingsStore();

// ----- Refs

const recordCurrencyId: Ref<string | null> = ref(settingsStore.defaultCurrencyId);

const startEpoch: Ref<number> = ref(setDateToTheFirstDateOfMonth(Date.now()));
const endEpoch: Ref<number> = ref(Date.now());
const overview: Ref<Overview | null> = ref(null);
const budgetList: Ref<Budget[]> = ref([]);

const isLoading = ref(false);

// ----- Functions

async function loadOverview() {
  let newOverview = await computationService.computeOverview(startEpoch.value, endEpoch.value, recordCurrencyId.value!);
  overview.value = newOverview;
}
const loadOverviewDebounced = debounceAsync(loadOverview, 100, { leading: false });

async function loadData() {
  isLoading.value = true;

  await loadOverviewDebounced();

  let res = await pouchdbService.listByCollection(Collection.BUDGET);
  let newBudgetList = res.docs as Budget[];
  newBudgetList = newBudgetList.filter((budget) => budget.currencyId === recordCurrencyId.value!)
    .filter(budget => budget.startEpoch <= Date.now() && budget.endEpoch >= Date.now());
  await computationService.computeUsedAmountForBudgetListInPlace(newBudgetList);
  newBudgetList.sort((a, b) => a.name.localeCompare(b.name));
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
  return `${Math.round(((budget._usedAmount || 0) / budget.overflowLimit) * 10000) / 100}%`;
}

// ----- Watchers

watch(recordCurrencyId, (newValue, __) => {
  if (newValue) {
    loadData();
  }
});

// ----- Execution

loadData();
</script>

<style scoped lang="scss">
@import url(./../css/table.scss);

.filter-row {
  display: flex;
  align-items: baseline;
}

.page {
  display: flex;
  flex-direction: column;
}

.title-row {
  padding-bottom: 0px;
}
</style>
