<template>
  <q-page class="column items-center justify-start">
    <!-- Filter - Start -->
    <q-card class="std-card" v-if="ledger">
      <div class="title-row q-pa-md q-gutter-sm">
        <q-btn color="secondary" icon="filter_list" flat round @click="setFiltersClicked" />
        <div class="title">
          {{ ledger.account.name }} Ledger
          <div class="sub-title" v-if="filters">
            <span v-if="filters.startEpoch === 0">
              <span v-if="ledger.ledgerEntryList.length > 0">
                {{ prettifyDate(ledger.ledgerEntryList[0].entryEpoch) }} to {{ prettifyDate(filters.endEpoch) }}
              </span>
              <span v-else>
                Up to {{ prettifyDate(filters.endEpoch) }}
              </span>
            </span>
            <span v-else>
              {{ prettifyDate(filters.startEpoch) }} to {{ prettifyDate(filters.endEpoch) }}
            </span>
          </div>
          <div class="sub-title" v-if="filters && filters._currency">
            Currency: {{ filters._currency.name }}
          </div>
        </div>
      </div>

    </q-card>
    <!-- Filter - End -->

    <q-card class="std-card q-pa-md" :hidden="!isLoading">
      <loading-indicator :is-loading="isLoading" :phases="3" ref="loadingIndicator"></loading-indicator>
    </q-card>

    <!-- Ledger - Start -->
    <q-card class="std-card" v-if="!isLoading && ledger && ledger.ledgerEntryList.length > 0">
      <div class="q-pa-md ledger-presentation">
        <div class="fin-presentation-head-container row">
          <div class="fin-presentation-head-numeric date-head">Date</div>
          <div class="fin-presentation-head-textual particulars-head">Particulars</div>
          <div class="fin-presentation-head-numeric debit-head">Debit</div>
          <div class="fin-presentation-head-numeric credit-head">Credit</div>
          <div class="fin-presentation-head-numeric balance-head">
            Balance ({{ ledger.isBalanceDebit ? "Debit" : "Credit" }})
          </div>
        </div>
        <template v-for="ledgerEntry in ledger.ledgerEntryList" v-bind:key="ledgerEntry.serial">
          <div class="fin-presentation-row ledger-entry row">
            <div class="fin-presentation-item-numeric date">
              {{ prettifyDate(ledgerEntry.entryEpoch) }}
            </div>
            <div class="fin-presentation-item-textual particulars-text">
              {{ ledgerEntry.description }}
              <div v-if="ledgerEntry.notes">{{ ledgerEntry.notes }}</div>
            </div>
            <div class="fin-presentation-item-numeric debit-sum">{{ ledgerEntry.debitAmount }}&nbsp;{{
              ledgerEntry._currencySign }}</div>
            <div class="fin-presentation-item-numeric credit-sum">{{ ledgerEntry.creditAmount }}&nbsp;{{
              ledgerEntry._currencySign }}</div>
            <div class="fin-presentation-item-numeric balance-sum">{{ ledgerEntry.balance }}&nbsp;{{
              ledgerEntry._currencySign }}</div>
          </div>
        </template>
      </div>
    </q-card>
    <!-- Ledger - End -->

    <!-- Summary - Start -->
    <q-card class="std-card" v-if="!isLoading && ledger && ledger.balanceList.length > 0">
      <div class="q-pa-md balance-presentation">
        <div class="fin-presentation-head-container balance-head row">
          <div class="fin-presentation-head-textual currency-head">Currency</div>
          <div class="fin-presentation-head-numeric balance-head">Total Balance</div>
        </div>
        <template v-for="balanceEntry in ledger.balanceList" v-bind:key="balanceEntry.currencyId">
          <div class="fin-presentation-row balance-entry row">
            <div class="fin-presentation-item-textual currency">
              {{ balanceEntry._currency!.name }}
            </div>
            <div class="fin-presentation-item-numeric balance">
              {{ balanceEntry.balance }}&nbsp;{{ balanceEntry._currency?.sign }}
            </div>
          </div>
        </template>
      </div>
    </q-card>
    <!-- Summary - End -->

  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { AccLedgerEntry } from "src/models/accounting/acc-ledger-entry";
import { Record } from "src/models/record";
import { accountingService } from "src/services/accounting-service";
import { Ref, onMounted, ref, watch } from "vue";
import { deepClone, prettifyDate, prettifyDateTime, sleep } from "src/utils/misc-utils";
import { Collection, dateRangePresetList, defaultPartyType, partyTypeList } from "src/constants/constants";
import DateInput from "src/components/lib/DateInput.vue";
import { getStartAndEndEpochFromPreset } from "src/utils/date-range-preset-utils";
import { AccLedgerFilters } from "src/models/accounting/acc-ledger-filters";
import FilterAccLedgerDialog from "src/components/FilterAccLedgerDialog.vue";
import { useRoute, useRouter } from "vue-router";
import { AccJournalFilters } from "src/models/accounting/acc-journal-filters";
import { dialogService } from "src/services/dialog-service";
import { AccAccount } from "src/models/accounting/acc-account";
import { AccLedger } from "src/models/accounting/acc-ledger";
import { dataInferenceService } from "src/services/data-inference-service";
import LoadingIndicator from "src/components/LoadingIndicator.vue";

const getDefaultFilters = (): AccLedgerFilters => {
  return {
    startEpoch: 0,
    endEpoch: Date.now(),
    filterByCurrencyId: null
  };
};

const $q = useQuasar();
const route = useRoute();
const router = useRouter();

// ----- Refs
const isLoading = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const ledger: Ref<AccLedger | null> = ref(null);
const filters: Ref<AccLedgerFilters> = ref(getDefaultFilters());

// ----- Functions
async function loadData() {
  isLoading.value = true;

  loadingIndicator.value?.startPhase({ phase: 1, weight: 60, label: "Preparing accounting data" });
  const progressNotifierFn = (progressFraction: number) => {
    loadingIndicator.value?.setProgress(progressFraction);
  };
  const {
    accountMap,
    accountList,
    journalEntryList,
  } = await accountingService.initiateAccounting(progressNotifierFn);

  const { startEpoch, endEpoch } = filters.value;
  const journalFilters: AccJournalFilters = {
    startEpoch,
    endEpoch
  };

  loadingIndicator.value?.startPhase({ phase: 2, weight: 20, label: "Applying filters" });
  const filteredJournalEntryList = await accountingService.applyJournalFilters(journalEntryList, journalFilters);

  const accountCode = route.params.accountCode || null;
  if (!accountCode || Array.isArray(accountCode)) {
    dialogService.alert("Error", "Routing error");
    router.push({ name: "acc-accounts" });
    return;
  }
  if (!(accountCode in accountMap)) {
    dialogService.alert("Error", "Routing error");
    router.push({ name: "acc-accounts" });
    return;
  }

  await loadingIndicator.value?.waitMinimalDuration(400);

  loadingIndicator.value?.startPhase({ phase: 3, weight: 20, label: "Preparing ledger" });
  const _ledger = await accountingService.generateLedgerFromJournal(filteredJournalEntryList, accountMap, accountCode);
  if (filters.value.filterByCurrencyId) {
    _ledger.ledgerEntryList = _ledger.ledgerEntryList.filter(entry => entry.currencyId === filters.value.filterByCurrencyId);
    _ledger.balanceList = _ledger.balanceList.filter(entry => entry.currencyId === filters.value.filterByCurrencyId);
  }

  console.debug({ ..._ledger });

  ledger.value = _ledger;

  isLoading.value = false;
}


// ----- Event Handlers


async function setFiltersClicked() {
  $q.dialog({ component: FilterAccLedgerDialog, componentProps: { inputFilters: deepClone(filters.value) } }).onOk(async (res: AccLedgerFilters) => {
    filters.value = res;
    filters.value._currency = undefined;
    if (filters.value.filterByCurrencyId) {
      filters.value._currency = await dataInferenceService.getCurrency(filters.value.filterByCurrencyId);
    }
    loadData();
  });
}



// ----- Computed and Embedded

// ----- Watchers


// ----- Execution

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
@import "./../css/finance.scss";

.debit-total,
.credit-total,
.debit-sum,
.credit-sum {
  text-align: right;
}
</style>
