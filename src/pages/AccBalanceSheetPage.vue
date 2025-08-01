<template>
  <q-page class="column items-center justify-start">
    <!-- Filter - Start -->
    <q-card class="std-card" v-if="trialBalance">
      <div class="title-row q-pa-md q-gutter-sm">
        <q-btn color="secondary" icon="filter_list" flat round @click="setFiltersClicked" />
        <div class="title">
          <span>Balance Sheet</span>
          <div class="sub-title" v-if="filters">
            <span v-if="filters.startEpoch === 0">
              <span> Up to {{ prettifyDate(filters.endEpoch) }} </span>
            </span>
            <span v-else> {{ prettifyDate(filters.startEpoch) }} to {{ prettifyDate(filters.endEpoch) }} </span>
          </div>
        </div>
      </div>
    </q-card>
    <!-- Filter - End -->

    <q-card class="std-card q-pa-md" :hidden="!isLoading">
      <loading-indicator :is-loading="isLoading" :phases="3" ref="loadingIndicator"></loading-indicator>
    </q-card>

    <!-- Ledger - Start -->
    <template v-if="!isLoading && trialBalance">
      <q-card class="std-card q-pa-md">
        <div class="fin-presentation-container" v-for="aType in ['Asset', 'Liability', 'Equity']" v-bind:key="aType">
          <div class="fin-presentation">
            <div class="fin-presentation-head-container row">
              <div class="fin-presentation-head-textual particulars-head">{{ aType }} Account</div>
              <template v-for="trialBalanceWithCurrency in trialBalance.trialBalanceWithCurrencyList" v-bind:key="trialBalanceWithCurrency.currencyId">
                <div class="fin-presentation-head-numeric debit-head">{{ trialBalanceWithCurrency._currency!.sign }}</div>
              </template>
            </div>
            <template
              v-for="(balanceEntry, balanceEntryIndex) in trialBalance.trialBalanceWithCurrencyList[0].trialBalanceOfTypeMap[aType].balanceList"
              v-bind:key="balanceEntry.account.code"
            >
              <div class="fin-presentation-row row">
                <div class="fin-presentation-item-textual">
                  {{ balanceEntry.account.name }}
                </div>
                <template v-for="trialBalanceWithCurrency in trialBalance.trialBalanceWithCurrencyList" v-bind:key="trialBalanceWithCurrency.currencyId">
                  <div class="fin-presentation-item-numeric debit-sum">
                    {{
                      printAmount(
                        trialBalanceWithCurrency.trialBalanceOfTypeMap[aType].balanceList[balanceEntryIndex]?.balance || 0,
                        trialBalanceWithCurrency._currency!._id
                      )
                    }}
                  </div>
                </template>
              </div>
            </template>
            <div class="fin-presentation-head-container row">
              <div class="fin-presentation-head-textual">Total {{ aType }}</div>
              <template v-for="trialBalanceWithCurrency in trialBalance.trialBalanceWithCurrencyList" v-bind:key="trialBalanceWithCurrency.currencyId">
                <div class="fin-presentation-head-numeric debit-total">
                  {{ printAmount(trialBalanceWithCurrency.trialBalanceOfTypeMap[aType].totalBalance, trialBalanceWithCurrency._currency!._id) }}
                </div>
              </template>
            </div>
          </div>
        </div>
        <div class="fin-presentation-head-container row">
          <div class="fin-presentation-head-textual">Total Liability + Equity</div>
          <template v-for="trialBalanceWithCurrency in trialBalance.trialBalanceWithCurrencyList" v-bind:key="trialBalanceWithCurrency.currencyId">
            <div class="fin-presentation-head-numeric debit-total">
              {{
                printAmount(
                  trialBalanceWithCurrency.trialBalanceOfTypeMap["Liability"].totalBalance +
                    trialBalanceWithCurrency.trialBalanceOfTypeMap["Equity"].totalBalance,
                  trialBalanceWithCurrency._currency!._id
                )
              }}
            </div>
          </template>
        </div>
      </q-card>
    </template>
    <!-- Ledger - End -->
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import FilterAccStatementDialog from "src/components/FilterAccStatementDialog.vue";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { AccJournalFilters } from "src/models/accounting/acc-journal-filters";
import { AccLedgerFilters } from "src/models/accounting/acc-ledger-filters";
import { AccStatementFilters } from "src/models/accounting/acc-statement-filters";
import { AccTrialBalance } from "src/models/accounting/acc-trial-balance";
import { accountingService } from "src/services/accounting-service";
import { printAmount } from "src/utils/de-facto-utils";
import { deepClone, prettifyDate } from "src/utils/misc-utils";
import { Ref, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const getDefaultFilters = () => {
  return {
    startEpoch: 0,
    endEpoch: Date.now(),
  };
};

const $q = useQuasar();
const router = useRouter();

// ----- Refs
const isLoading = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const trialBalance: Ref<AccTrialBalance | null> = ref(null);
const filters: Ref<AccStatementFilters> = ref(getDefaultFilters());

// ----- Functions
async function loadData() {
  isLoading.value = true;

  loadingIndicator.value?.startPhase({ phase: 1, weight: 60, label: "Preparing accounting data" });
  const progressNotifierFn = (progressFraction: number) => {
    loadingIndicator.value?.setProgress(progressFraction);
  };
  const { accountMap, accountList, journalEntryList } = await accountingService.initiateAccounting(progressNotifierFn);

  const { startEpoch, endEpoch } = filters.value;
  const journalFilters: AccJournalFilters = {
    startEpoch,
    endEpoch,
  };
  await loadingIndicator.value?.waitMinimalDuration(400);
  loadingIndicator.value?.startPhase({ phase: 2, weight: 20, label: "Applying filters" });
  const filteredJournalEntryList = await accountingService.applyJournalFilters(journalEntryList, journalFilters);

  loadingIndicator.value?.startPhase({ phase: 3, weight: 20, label: "Preparing trial balance" });
  const _trialBalance = await accountingService.generateTrialBalanceFromJournal(filteredJournalEntryList, accountMap);

  console.debug({ ..._trialBalance });

  trialBalance.value = _trialBalance;

  isLoading.value = false;
}

// ----- Event Handlers

async function setFiltersClicked() {
  $q.dialog({ component: FilterAccStatementDialog, componentProps: { inputFilters: deepClone(filters.value) } }).onOk((res: AccLedgerFilters) => {
    filters.value = res;
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

.debit-head {
  text-align: center;
}

.debit-total,
.debit-sum {
  text-align: right;
}
</style>
