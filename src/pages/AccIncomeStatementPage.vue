<template>
  <q-page class="column items-center justify-start">
    <!-- Filter - Start -->
    <q-card class="std-card" v-if="trialBalance">
      <div class="title-row q-pa-md q-gutter-sm">
        <q-btn color="secondary" icon="filter_list" flat round @click="setFiltersClicked" />
        <div class="title">
          <span>Income Statement</span>
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

    <!-- Income Statement Tables - Start -->
    <template v-if="!isLoading && trialBalance">
      <q-card class="std-card q-pa-md q-mb-md">
        <template v-for="aType in ['Income', 'Expense']" v-bind:key="aType">
          <div
            class="q-mb-md"
            v-if="trialBalance.trialBalanceWithCurrencyList.length > 0 && trialBalance.trialBalanceWithCurrencyList[0].trialBalanceOfTypeMap[aType]"
          >
            <q-table
              :title="`${aType} Account`"
              :rows="getTableRows(aType)"
              :columns="getTableColumns()"
              row-key="accountCode"
              flat
              bordered
              hide-pagination
              hide-no-data
              :separator="'horizontal'"
            >
              <template v-slot:body-cell-account="props">
                <q-td :props="props">{{ props.value }}</q-td>
              </template>
              <template
                v-for="currency in trialBalance.trialBalanceWithCurrencyList"
                :key="currency.currencyId"
                v-slot:[`body-cell-${currency.currencyId}`]="props"
              >
                <q-td :props="props" class="text-right">
                  <span v-if="props.value !== null && props.value !== undefined">{{ printAmount(props.value, currency._currency!._id) }}</span>
                </q-td>
              </template>
              <template v-slot:bottom-row>
                <q-tr>
                  <q-td class="text-weight-medium">Total {{ aType }}</q-td>
                  <template v-for="trialBalanceWithCurrency in trialBalance.trialBalanceWithCurrencyList" :key="trialBalanceWithCurrency.currencyId">
                    <q-td class="text-right text-weight-medium">
                      {{ printAmount(trialBalanceWithCurrency.trialBalanceOfTypeMap[aType].totalBalance, trialBalanceWithCurrency._currency!._id) }}
                    </q-td>
                  </template>
                </q-tr>
              </template>
            </q-table>
          </div>
        </template>
        <!-- Total Profit Row -->
        <div class="q-mt-md" v-if="trialBalance.trialBalanceWithCurrencyList.length > 0">
          <q-table title="Total Profit" :rows="[]" :columns="getTableColumns()" flat bordered hide-pagination hide-no-data :separator="'horizontal'">
            <template v-slot:bottom-row>
              <q-tr>
                <q-td class="text-weight-medium">Total Profit</q-td>
                <template v-for="trialBalanceWithCurrency in trialBalance.trialBalanceWithCurrencyList" :key="trialBalanceWithCurrency.currencyId">
                  <q-td class="text-right text-weight-medium">
                    {{
                      printAmount(
                        trialBalanceWithCurrency.trialBalanceOfTypeMap["Equity"].balanceList.find(
                          (balance) => balance.account.code === AccDefaultAccounts.EQUITY__RETAINED_EARNINGS.code
                        )?.balance,
                        trialBalanceWithCurrency._currency!._id
                      )
                    }}
                  </q-td>
                </template>
              </q-tr>
            </template>
          </q-table>
        </div>
      </q-card>
    </template>
    <!-- Income Statement Tables - End -->
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import FilterAccStatementDialog from "src/components/FilterAccStatementDialog.vue";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { AccDefaultAccounts } from "src/constants/accounting-constants";
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

// ----- Table Configuration
function getTableColumns() {
  if (!trialBalance.value || !trialBalance.value.trialBalanceWithCurrencyList || trialBalance.value.trialBalanceWithCurrencyList.length === 0) {
    return [];
  }
  const columns: any[] = [
    {
      name: "account",
      required: true,
      label: "Account",
      align: "left" as const,
      field: "accountName",
      sortable: false,
    },
  ];
  trialBalance.value.trialBalanceWithCurrencyList.forEach((trialBalanceWithCurrency) => {
    columns.push({
      name: trialBalanceWithCurrency.currencyId,
      label: trialBalanceWithCurrency._currency!.sign,
      align: "right" as const,
      field: trialBalanceWithCurrency.currencyId,
      sortable: false,
    });
  });
  return columns;
}

function getTableRows(accountType: string) {
  if (!trialBalance.value || !trialBalance.value.trialBalanceWithCurrencyList || trialBalance.value.trialBalanceWithCurrencyList.length === 0) {
    return [];
  }
  const firstCurrency = trialBalance.value.trialBalanceWithCurrencyList[0];
  const balanceList = firstCurrency.trialBalanceOfTypeMap[accountType]?.balanceList;
  if (!balanceList || !Array.isArray(balanceList)) {
    return [];
  }
  return balanceList.map((balanceEntry: any, index: number) => {
    const row: any = {
      accountCode: balanceEntry.account.code,
      accountName: balanceEntry.account.name,
    };
    trialBalance.value!.trialBalanceWithCurrencyList.forEach((trialBalanceWithCurrency) => {
      const entry = trialBalanceWithCurrency.trialBalanceOfTypeMap[accountType]?.balanceList[index];
      row[trialBalanceWithCurrency.currencyId] = entry?.balance || 0;
    });
    return row;
  });
}

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

<style scoped lang="scss"></style>
