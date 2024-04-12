<template>
  <q-page class="column items-center justify-start">
    <!-- Filter - Start -->
    <q-card class="std-card" v-if="trialBalance">
      <div class="title-row q-pa-md q-gutter-sm">
        <q-btn color="secondary" icon="filter_list" flat round @click="setFiltersClicked" />
        <div class="title">
          <span>Trial Balance</span>
          <div class="sub-title" v-if="filters">
            <span v-if="filters.startEpoch === 0">
              <span>
                Up to {{ prettifyDate(filters.endEpoch) }}
              </span>
            </span>
            <span v-else>
              {{ prettifyDate(filters.startEpoch) }} to {{ prettifyDate(filters.endEpoch) }}
            </span>
          </div>
        </div>
      </div>

    </q-card>
    <!-- Filter - End -->

    <!-- Ledger - Start -->
    <template v-if="!isLoading && trialBalance">
      <q-card class="std-card" v-for="trialBalanceWithCurrency in trialBalance.trialBalanceWithCurrencyList"
        v-bind:key="trialBalanceWithCurrency.currencyId">

        <div class="fin-presentation-container q-pa-md" v-for="aType in AccTypeList" v-bind:key="aType">
          <div class="fin-presentation-title">{{ aType }}&nbsp;({{ trialBalanceWithCurrency._currency!.name }})</div>
          <div class="fin-presentation">
            <div class="fin-presentation-head-container row">
              <div class="fin-presentation-head-textual particulars-head">Account</div>
              <div class="fin-presentation-head-numeric debit-head">Debit</div>
              <div class="fin-presentation-head-numeric credit-head">Credit</div>
            </div>
            <template v-for="balanceEntry in trialBalanceWithCurrency.trialBalanceOfTypeMap[aType].balanceList"
              v-bind:key="balanceEntry.account.code">
              <div class="fin-presentation-row row">
                <div class="fin-presentation-item-textual">
                  {{ balanceEntry.account.name }}
                </div>
                <div class="fin-presentation-item-numeric debit-sum" v-if="balanceEntry.isBalanceDebit">{{
                  balanceEntry.balance }}&nbsp;{{
                    trialBalanceWithCurrency._currency!.sign }}
                </div>
                <div class="fin-presentation-item-numeric credit-sum" v-if="balanceEntry.isBalanceDebit"></div>
                <div class="fin-presentation-item-numeric debit-sum" v-if="!balanceEntry.isBalanceDebit"></div>
                <div class="fin-presentation-item-numeric credit-sum" v-if="!balanceEntry.isBalanceDebit">{{
                  balanceEntry.balance }}&nbsp;{{
                    trialBalanceWithCurrency._currency!.sign }}
                </div>
              </div>
            </template>
            <div class="fin-presentation-head-container row">
              <div class="fin-presentation-head-textual">Total</div>
              <div class="fin-presentation-head-numeric debit-total"
                v-if="trialBalanceWithCurrency.trialBalanceOfTypeMap[aType].isBalanceDebit">
                {{ trialBalanceWithCurrency.trialBalanceOfTypeMap[aType].totalBalance }}&nbsp;{{
                  trialBalanceWithCurrency._currency!.sign }}
              </div>
              <div class="fin-presentation-head-numeric credit-total"
                v-if="trialBalanceWithCurrency.trialBalanceOfTypeMap[aType].isBalanceDebit">
              </div>
              <div class="fin-presentation-head-numeric debit-total"
                v-if="!trialBalanceWithCurrency.trialBalanceOfTypeMap[aType].isBalanceDebit">
              </div>
              <div class="fin-presentation-head-numeric credit-total"
                v-if="!trialBalanceWithCurrency.trialBalanceOfTypeMap[aType].isBalanceDebit">
                {{ trialBalanceWithCurrency.trialBalanceOfTypeMap[aType].totalBalance }}&nbsp;{{
                  trialBalanceWithCurrency._currency!.sign }}
              </div>
            </div>
          </div>
        </div>
      </q-card>
    </template>
    <!-- Ledger - End -->
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import FilterAccStatementDialog from "src/components/FilterAccStatementDialog.vue";
import { AccTypeList } from "src/constants/accounting-constants";
import { AccJournalFilters } from "src/models/accounting/acc-journal-filters";
import { AccLedgerFilters } from "src/models/accounting/acc-ledger-filters";
import { AccStatementFilters } from "src/models/accounting/acc-statement-filters";
import { AccTrialBalance } from "src/models/accounting/acc-trial-balance";
import { Record } from "src/models/record";
import { accountingService } from "src/services/accounting-service";
import { deepClone, prettifyDate } from "src/utils/misc-utils";
import { Ref, ref } from "vue";
import { useRouter } from "vue-router";

const getDefaultFilters = () => {
  return {
    startEpoch: 0,
    endEpoch: Date.now()
  };
};

const $q = useQuasar();
const router = useRouter();

const trialBalance: Ref<AccTrialBalance | null> = ref(null);

// ----- Refs
const isLoading = ref(false);

const filters: Ref<AccStatementFilters> = ref(getDefaultFilters());

// ----- Functions
async function loadData() {
  isLoading.value = true;

  const {
    accountMap,
    accountList,
    journalEntryList,
  } = await accountingService.initiateAccounting();

  const { startEpoch, endEpoch } = filters.value;
  const journalFilters: AccJournalFilters = {
    startEpoch,
    endEpoch
  };
  const filteredJournalEntryList = await accountingService.applyJournalFilters(journalEntryList, journalFilters);

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

loadData();
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
