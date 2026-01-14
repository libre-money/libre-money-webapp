<template>
  <q-page padding class="column items-center">
    <!-- Budget Highlights -->
    <BudgetHighlights
      ref="budgetHighlightsRef"
      :record-filters="recordFilters"
      :filter-month="filterMonth"
      :filter-year="filterYear"
      @reloadRecords="loadData"
    />
    <!-- End of Budget Highlights -->

    <!-- Records -->
    <div class="std-card full-width">
      <div class="title-row q-pa-md q-gutter-sm">
        <q-btn color="secondary" icon="filter_list" flat round @click="setFiltersClicked" />
        <q-btn color="blue-6" icon="bar_chart" flat round @click="showQuickExpenseSummaryClicked" />
        <q-btn color="green-6" icon="wallet" flat round @click="showQuickBalanceClicked" />
        <div class="title">
          <div class="month-and-year-input-wrapper" v-if="!recordFilters && $q.screen.gt.xs">
            <month-and-year-input v-model:month="filterMonth" v-model:year="filterYear" @selection="monthAndYearSelected()"></month-and-year-input>
          </div>
        </div>
        <q-btn-dropdown size="md" color="primary" label="Add Expenses" split @click="addExpenseClicked">
          <q-list>
            <q-item clickable v-close-popup @click="addIncomeClicked">
              <q-item-section>
                <q-item-label>Add Income</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="addMoneyTransferClicked">
              <q-item-section>
                <q-item-label>Transfer Money</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator inset />
            <q-item clickable v-close-popup @click="applyTemplateClicked">
              <q-item-section>
                <q-item-label>Use Template</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator inset />
            <q-item clickable v-close-popup @click="importTextClicked">
              <q-item-section>
                <q-item-label>Import Text</q-item-label>
              </q-item-section>
            </q-item>

            <q-item clickable v-close-popup @click="showQuickBalanceCalibrationClicked">
              <q-item-section>
                <q-item-label>Calibrate Balances</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator inset />
            <q-item clickable v-close-popup @click="showQuickSummaryClicked">
              <q-item-section>
                <q-item-label>View Quick Summary</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>

      <div class="q-pa-sm" style="padding-top: 0px; margin-top: -8px; margin-bottom: 8px">
        <div class="filters-activated-area" v-if="recordFilters">
          <div style="flex: 1">
            <span v-if="recordFilters.type === 'standard'">These results are filtered.</span>
            <span v-else-if="recordFilters.type === 'budget' && recordFilters._budgetName === UNBUDGETED_RECORDS_BUDGET_NAME">Viewing unbudgeted records.</span>
            <span v-else-if="recordFilters.type === 'budget'">Viewing records under budget: {{ recordFilters._budgetName }}.</span>
            <span v-else-if="recordFilters.type === 'loansAndDebts' || recordFilters.type === 'parties'">
              Viewing dealings with party: {{ recordFilters._partyName }}.
            </span>
          </div>
          <q-btn size="sm" color="secondary" outline rounded label="Clear" @click="clearFiltersClicked" />
        </div>

        <div class="month-and-year-input-wrapper" v-if="!recordFilters && $q.screen.lt.sm">
          <month-and-year-input v-model:month="filterMonth" v-model:year="filterYear" @selection="monthAndYearSelected()"></month-and-year-input>
        </div>

        <loading-indicator :is-loading="isLoading" :phases="4" ref="loadingIndicator"></loading-indicator>

        <template v-if="!isLoading">
          <div v-for="(record, index) in rows" class="record-row" v-bind:key="record._id">
            <template v-if="index === 0 || prettifyDate(rows[index].transactionEpoch) !== prettifyDate(rows[index - 1].transactionEpoch)">
              <div class="divider-line-different-day">
                <div class="divider-line-date">
                  <div class="divider-line-inner">{{ prettifyDate(rows[index].transactionEpoch) }}</div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="divider-line-same-day"></div>
            </template>

            <!-- Unified Single Amount Record - start -->
            <q-card flat bordered class="expense-record-card" v-if="isSingleAmountType(record)">
              <q-card-section>
                <div class="record-date text-weight-light text-grey-6">
                  <div>{{ prettifyDate(record.transactionEpoch) }}</div>
                  <template v-if="isPotentialDuplicate(record)">
                    <q-icon name="flag" class="duplicate-flag" title="Potential duplicate" /> Potential duplicate
                  </template>
                </div>
                <div class="single-amount-row row" :data-index="index">
                  <div class="details-section">
                    <div class="text-h6" v-if="record.type === RecordType.EXPENSE">
                      {{ record.expense?.expenseAvenue.name }}
                    </div>
                    <div class="text-h5" v-else-if="record.type === RecordType.INCOME">
                      {{ record.income?.incomeSource.name }}
                    </div>
                    <div class="" v-else-if="getAsset(record)">Asset: {{ getAsset(record)!.name }}</div>

                    <div class="row secondary-line text-body2 text-grey-7">
                      <div class="party" v-if="getParty(record)">
                        <span class="party-type">{{ getParty(record)?.type }}</span
                        >: {{ getParty(record)?.name }}
                      </div>
                    </div>

                    <div class="notes text-body2 text-grey-7 q-mb-sm" v-if="record.notes">Notes: {{ record.notes }}</div>

                    <div class="tags-line">
                      <q-chip size="sm" class="text-capitalize record-type" :data-record-type="record.type">{{ record.typePrettified }}</q-chip>
                      <q-chip outline size="sm" v-for="tag in record.tagList" v-bind:key="tag._id" :style="`border-color: ${tag.color}`">{{ tag.name }}</q-chip>
                    </div>
                  </div>

                  <div class="amounts-section">
                    <div class="amount" :class="{ '': isRecordOutFlow(record), 'text-positive': isRecordInFlow(record) }">
                      {{ printAmount(getNumber(record, "amount")!, getString(record, "currencyId")!) }}
                    </div>
                    <div class="flex items-center justify-end">
                      <div class="wallet q-mr-sm" v-if="getWallet(record)">({{ getWallet(record)!.name }})</div>
                      <div class="username" v-if="record.modifiedByUsername">
                        <q-icon name="account_circle"></q-icon>
                        {{ record.modifiedByUsername }}
                      </div>
                    </div>

                    <div class="unpaid-amount" v-if="getNumber(record, 'amountUnpaid')! > 0">
                      Unpaid:
                      {{ printAmount(getNumber(record, "amountUnpaid")!, getString(record, "currencyId")!) }}
                    </div>
                    <div class="controls q-my-sm">
                      <q-btn round outline color="primary" icon="create" size="8px" class="q-mr-xs" @click="editSingleAmountRecordClicked(record)" />
                      <q-btn round outline color="negative" icon="delete" size="8px" @click="deleteClicked(record)" />
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
            <!-- Unified Single Amount Record -->

            <!-- Money Transfer - start -->
            <q-card flat bordered class="expense-record-card" v-else-if="record.type === RecordType.MONEY_TRANSFER && record.moneyTransfer">
              <q-card-section>
                <div class="single-amount-row col money-transfer-row" :data-index="index">
                  <div class="details-section">
                    <div class="record-date text-weight-light text-grey-6">
                      <div>{{ prettifyDate(record.transactionEpoch) }}</div>
                      <template v-if="isPotentialDuplicate(record)">
                        <q-icon name="flag" class="duplicate-flag" title="Potential duplicate" /> Potential duplicate
                      </template>
                    </div>

                    <table class="full-width">
                      <tbody>
                        <tr>
                          <td class="text-h6">From: {{ record.moneyTransfer.fromWallet?.name }}</td>
                          <td class="text-right" width="50%">
                            <div class="amounts-section">
                              <div class="amount amount-out">{{ printAmount(record.moneyTransfer.fromAmount, record.moneyTransfer.fromCurrencyId) }}</div>
                              <div class="wallet">({{ record.moneyTransfer.fromWallet?.name }})</div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td class="text-h6">To: {{ record.moneyTransfer.toWallet?.name }}</td>
                          <td class="text-right">
                            <div class="amounts-section">
                              <div class="amount amount-in">{{ printAmount(record.moneyTransfer.toAmount, record.moneyTransfer.toCurrencyId) }}</div>
                              <div class="wallet">({{ record.moneyTransfer.toWallet?.name }})</div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="row justify-between q-mt-sm">
                    <div>
                      <div class="notes text-body2 text-grey-7 q-mb-sm" v-if="record.notes">Notes: {{ record.notes }}</div>

                      <div class="tags-line">
                        <q-chip size="sm" class="text-capitalize record-type" :data-record-type="record.type">{{ record.typePrettified }}</q-chip>
                        <q-chip outline size="sm" v-for="tag in record.tagList" v-bind:key="tag._id" :style="`border-color: ${tag.color}`">{{
                          tag.name
                        }}</q-chip>
                      </div>
                    </div>
                    <div class="amounts-section">
                      <div class="flex items-center justify-end">
                        <div class="username" v-if="record.modifiedByUsername">
                          <q-icon name="account_circle"></q-icon>
                          {{ record.modifiedByUsername }}
                        </div>
                      </div>
                      <div class="controls q-my-sm">
                        <q-btn round outline color="primary" icon="create" size="8px" class="q-mr-xs" @click="editMoneyTransferClicked(record)" />
                        <q-btn round outline color="negative" icon="delete" size="8px" @click="deleteClicked(record)" />
                      </div>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
            <!-- Money Transfer -->

            <div class="misc-row" v-else :data-index="index">{{ record }}</div>
          </div>
        </template>

        <div class="q-pa-lg flex flex-center">
          <q-pagination v-model="paginationCurrentPage" :max="paginationMaxPage" input />
        </div>
      </div>
    </div>
    <!-- End of Records -->

    <!-- Quick Summary - Start -->
    <q-card class="std-card" v-if="!isLoading && quickSummaryList.length > 0"> </q-card>
    <!-- Quick Summary - End -->
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import AddAssetAppreciationDepreciationRecord from "src/components/AddAssetAppreciationDepreciationRecord.vue";
import AddAssetPurchaseRecord from "src/components/AddAssetPurchaseRecord.vue";
import AddAssetSaleRecord from "src/components/AddAssetSaleRecord.vue";
import AddBorrowingRecord from "src/components/AddBorrowingRecord.vue";

import AddExpenseRecord from "src/components/AddExpenseRecord.vue";
import AddIncomeRecord from "src/components/AddIncomeRecord.vue";
import AddLendingRecord from "src/components/AddLendingRecord.vue";
import AddMoneyTransferRecord from "src/components/AddMoneyTransferRecord.vue";
import AddRepaymentGivenRecord from "src/components/AddRepaymentGivenRecord.vue";
import AddRepaymentReceivedRecord from "src/components/AddRepaymentReceivedRecord.vue";
import BudgetHighlights from "src/components/BudgetHighlights.vue";
import FilterRecordsDialog from "src/components/FilterRecordsDialog.vue";
import ImportTextDialog from "src/components/ImportTextDialog.vue";
import MonthAndYearInput from "src/components/lib/MonthAndYearInput.vue";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import QuickBalanceDialog from "src/components/QuickBalanceDialog.vue";
import QuickExpenseSummaryDialog from "src/components/QuickExpenseSummaryDialog.vue";
import QuickSummaryDialog from "src/components/QuickSummaryDialog.vue";
import SelectTemplateDialog from "src/components/SelectTemplateDialog.vue";
import { PROMISE_POOL_CONCURRENCY_LIMT, RECORD_BATCH_PROCESSING_OPTIMIZATION_THRESHOLD, UNBUDGETED_RECORDS_BUDGET_NAME } from "src/constants/config-constants";
import { Collection, RecordType } from "src/constants/constants";
import { Asset } from "src/models/asset";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { QuickSummary } from "src/models/inferred/quick-summary";
import { RecordFilters } from "src/models/inferred/record-filters";
import { Party } from "src/models/party";
import { Record } from "src/models/record";
import { Wallet } from "src/models/wallet";
import { computationService } from "src/services/computation-service";
import { dialogService } from "src/services/dialog-service";
import { duplicateFinderService } from "src/services/duplicate-finder-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { recordService } from "src/services/record-service";
import { useRecordFiltersStore } from "src/stores/record-filters-store";
import { useRecordPaginationSizeStore } from "src/stores/record-pagination";
import { normalizeEpochRange } from "src/utils/date-utils";
import { printAmount } from "src/utils/de-facto-utils";
import { deepClone, guessFontColorCode, prettifyDate } from "src/utils/misc-utils";
import PromisePool from "src/utils/promise-pool";
import { Ref, onMounted, ref, watch } from "vue";
import ExpenseRecordCard from "src/components/ExpenseRecordCard.vue";

const $q = useQuasar();

const recordPaginationStore = useRecordPaginationSizeStore();
const recordFiltersStore = useRecordFiltersStore();

recordFiltersStore.$subscribe((mutation, state) => {
  recordFilters.value = state.recordFilters;
});

// ----- Refs
const isLoading = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();
const budgetHighlightsRef = ref<InstanceType<typeof BudgetHighlights>>();

const rows: Ref<InferredRecord[]> = ref([]);

const recordCountPerPage = recordPaginationStore.recordPaginationSize;
const paginationCurrentPage: Ref<number> = ref(1);
const paginationMaxPage: Ref<number> = ref(1);

const recordFilters: Ref<RecordFilters | null> = ref(recordFiltersStore.recordFilters || null);

const filterMonth: Ref<number> = ref(new Date().getMonth());
const filterYear: Ref<number> = ref(new Date().getFullYear());

const quickSummaryList: Ref<QuickSummary[]> = ref([]);

let cachedInferredRecordList: InferredRecord[] = [];

// Duplicate detection
const duplicateIds: Ref<Set<string>> = ref(new Set<string>());

// ----- Functions
async function applyFilters(recordList: Record[]) {
  return recordService.applyRecordFilters(recordList, recordFilters.value);
}

async function loadData(origin = "unspecified") {
  isLoading.value = true;

  // Need to update cache if the cache is empty or the request is not from pagination interaction
  if (cachedInferredRecordList.length === 0 || origin !== "pagination") {
    budgetHighlightsRef.value?.hideRollingBudgets();

    loadingIndicator.value?.startPhase({ phase: 1, weight: 10, label: "Updating cache" });

    loadingIndicator.value?.startPhase({ phase: 2, weight: 20, label: "Filtering records" });
    let recordList = (await pouchdbService.listByCollection(Collection.RECORD)).docs as Record[];

    if (recordFilters.value) {
      recordList = await applyFilters(recordList);
    } else {
      let rangeStart = new Date(filterYear.value, filterMonth.value, 1);
      let rangeEnd = new Date(filterYear.value, filterMonth.value, 1);
      rangeEnd.setMonth(rangeEnd.getMonth() + 1);
      rangeEnd.setDate(rangeEnd.getDate() - 1);
      let [startEpoch, endEpoch] = normalizeEpochRange(rangeStart.getTime(), rangeEnd.getTime());
      recordList = recordList.filter((record) => record.transactionEpoch >= startEpoch && record.transactionEpoch <= endEpoch);
    }

    loadingIndicator.value?.startPhase({ phase: 3, weight: 10, label: "Sorting" });
    if (!recordFilters.value || recordFilters.value.sortBy === "transactionEpochDesc") {
      recordList.sort((a, b) => (b.transactionEpoch || 0) - (a.transactionEpoch || 0));
    } else {
      recordList.sort((a, b) => (b.modifiedEpoch || 0) - (a.modifiedEpoch || 0));
    }

    paginationMaxPage.value = Math.ceil(recordList.length / recordCountPerPage);
    if (paginationCurrentPage.value > paginationMaxPage.value) {
      paginationCurrentPage.value = paginationMaxPage.value;
    }

    loadingIndicator.value?.startPhase({ phase: 4, weight: 60, label: "Preparing view" });

    let inferredRecordList: InferredRecord[];
    if (recordList.length < RECORD_BATCH_PROCESSING_OPTIMIZATION_THRESHOLD) {
      let completedCount = 0;
      inferredRecordList = await PromisePool.mapList(recordList, PROMISE_POOL_CONCURRENCY_LIMT, async (rawData: Record) => {
        const result = await recordService.inferRecord(rawData);
        completedCount += 1;
        if (completedCount % Math.floor(recordList.length / 10) === 0) {
          loadingIndicator.value?.setProgress(completedCount / recordList.length);
        }
        return result;
      });
    } else {
      inferredRecordList = await recordService.inferInBatch(recordList);
    }

    loadingIndicator.value?.setProgress(1);

    cachedInferredRecordList = inferredRecordList;
  }

  let startIndex = (paginationCurrentPage.value - 1) * recordCountPerPage;
  rows.value = cachedInferredRecordList.slice(startIndex, startIndex + recordCountPerPage);

  // Detect duplicates if the feature is enabled
  if (recordFilters.value?.highlightDuplicates) {
    duplicateIds.value = duplicateFinderService.findPotentialDuplicates(cachedInferredRecordList);
  } else {
    duplicateIds.value = new Set<string>();
  }

  if (cachedInferredRecordList.length === 0 || origin !== "pagination") {
    budgetHighlightsRef.value?.loadFeaturedRollingBudgets();
  }

  isLoading.value = false;
}

// ----- Event Handlers

async function monthAndYearSelected() {
  loadData();
}

async function addExpenseClicked() {
  const componentProps = recordFilters.value?.walletId
    ? {
        suggestedWalletId: recordFilters.value.walletId,
        suggestedCurrencyId: ((await pouchdbService.getDocById(recordFilters.value.walletId)) as Wallet)?.currencyId,
      }
    : {};
  $q.dialog({ component: AddExpenseRecord, componentProps }).onOk(() => {
    paginationCurrentPage.value = 1;
    loadData();
  });
}

async function applyTemplateClicked() {
  $q.dialog({ component: SelectTemplateDialog, componentProps: { templateType: "all" } }).onOk((selectedTemplate: Record) => {
    selectedTemplate = deepClone(selectedTemplate);
    console.debug({ selectedTemplate });

    if (selectedTemplate.type === RecordType.EXPENSE) {
      $q.dialog({ component: AddExpenseRecord, componentProps: { useTemplateId: selectedTemplate._id } }).onOk(() => {
        paginationCurrentPage.value = 1;
        loadData();
      });
    } else if (selectedTemplate.type === RecordType.INCOME) {
      $q.dialog({ component: AddIncomeRecord, componentProps: { useTemplateId: selectedTemplate._id } }).onOk(() => {
        paginationCurrentPage.value = 1;
        loadData();
      });
    } else if (selectedTemplate.type === RecordType.MONEY_TRANSFER) {
      $q.dialog({ component: AddMoneyTransferRecord, componentProps: { useTemplateId: selectedTemplate._id } }).onOk(() => {
        paginationCurrentPage.value = 1;
        loadData();
      });
    } else if (selectedTemplate.type === RecordType.ASSET_PURCHASE) {
      $q.dialog({ component: AddAssetPurchaseRecord, componentProps: { useTemplateId: selectedTemplate._id } }).onOk(() => {
        paginationCurrentPage.value = 1;
        loadData();
      });
    }
  });
}

async function addIncomeClicked() {
  $q.dialog({ component: AddIncomeRecord }).onOk(() => {
    paginationCurrentPage.value = 1;
    loadData();
  });
}

async function addMoneyTransferClicked() {
  $q.dialog({ component: AddMoneyTransferRecord }).onOk(() => {
    paginationCurrentPage.value = 1;
    loadData();
  });
}

async function editSingleAmountRecordClicked(record: InferredRecord) {
  let component: any = AddExpenseRecord;
  if (record.type === RecordType.EXPENSE) {
    component = AddExpenseRecord;
  } else if (record.type === RecordType.INCOME) {
    component = AddIncomeRecord;
  } else if (record.type === RecordType.LENDING) {
    component = AddLendingRecord;
  } else if (record.type === RecordType.BORROWING) {
    component = AddBorrowingRecord;
  } else if (record.type === RecordType.REPAYMENT_GIVEN) {
    component = AddRepaymentGivenRecord;
  } else if (record.type === RecordType.REPAYMENT_RECEIVED) {
    component = AddRepaymentReceivedRecord;
  } else if (record.type === RecordType.ASSET_PURCHASE) {
    component = AddAssetPurchaseRecord;
  } else if (record.type === RecordType.ASSET_SALE) {
    component = AddAssetSaleRecord;
  } else if (record.type === RecordType.ASSET_APPRECIATION_DEPRECIATION) {
    component = AddAssetAppreciationDepreciationRecord;
  }

  $q.dialog({ component, componentProps: { existingRecordId: record._id } }).onOk(() => {
    loadData();
  });
}

async function editMoneyTransferClicked(record: InferredRecord) {
  $q.dialog({ component: AddMoneyTransferRecord, componentProps: { existingRecordId: record._id } }).onOk(() => {
    loadData();
  });
}

async function deleteClicked(record: InferredRecord) {
  let answer = await dialogService.confirm("Remove record", "Are you sure you want to remove the record?");
  if (!answer) return;

  let res = await pouchdbService.removeDoc(record);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the record.");
  }

  loadData();
}

async function showQuickBalanceClicked() {
  $q.dialog({ component: QuickBalanceDialog, componentProps: { intent: "balances" } }).onOk(() => {
    loadData();
  });
}

async function showQuickBalanceCalibrationClicked() {
  $q.dialog({ component: QuickBalanceDialog, componentProps: { intent: "calibration" } }).onOk(() => {
    loadData();
  });
}

async function showQuickExpenseSummaryClicked() {
  if (!cachedInferredRecordList.length) return;
  $q.dialog({ component: QuickExpenseSummaryDialog, componentProps: { recordList: cachedInferredRecordList } });
}

async function showQuickSummaryClicked() {
  let startEpoch,
    endEpoch = 0;
  if (recordFilters.value) {
    [startEpoch, endEpoch] = normalizeEpochRange(recordFilters.value.startEpoch, recordFilters.value.endEpoch);
  } else {
    let rangeStart = new Date(filterYear.value, filterMonth.value, 1);
    let rangeEnd = new Date(filterYear.value, filterMonth.value, 1);
    rangeEnd.setMonth(rangeEnd.getMonth() + 1);
    rangeEnd.setDate(rangeEnd.getDate() - 1);
    [startEpoch, endEpoch] = normalizeEpochRange(rangeStart.getTime(), rangeEnd.getTime());
  }

  const quickSummaryList = await computationService.computeQuickSummary(startEpoch, endEpoch, cachedInferredRecordList);
  $q.dialog({ component: QuickSummaryDialog, componentProps: { quickSummaryList } });
}

async function setFiltersClicked() {
  $q.dialog({ component: FilterRecordsDialog, componentProps: { inputFilters: recordFilters.value } }).onOk((res: RecordFilters) => {
    recordFilters.value = res;
    recordFiltersStore.setRecordFilters(res);
    loadData();
  });
}

async function clearFiltersClicked() {
  recordFilters.value = null;
  recordFiltersStore.setRecordFilters(null);
  loadData();
}

async function importTextClicked() {
  $q.dialog({ component: ImportTextDialog }).onOk(() => {
    paginationCurrentPage.value = 1;
    loadData();
  });
}

// ----- Computed and Embedded

function isRecordInFlow(record: InferredRecord) {
  return [RecordType.INCOME, RecordType.BORROWING, RecordType.REPAYMENT_RECEIVED, RecordType.ASSET_SALE].includes(record.type);
}

function isRecordOutFlow(record: InferredRecord) {
  return [RecordType.EXPENSE, RecordType.LENDING, RecordType.REPAYMENT_GIVEN, RecordType.ASSET_PURCHASE].includes(record.type);
}

function isSingleAmountType(record: InferredRecord) {
  return (
    (record.type === RecordType.EXPENSE && record.expense) ||
    (record.type === RecordType.INCOME && record.income) ||
    (record.type === RecordType.LENDING && record.lending) ||
    (record.type === RecordType.BORROWING && record.borrowing) ||
    (record.type === RecordType.REPAYMENT_GIVEN && record.repaymentGiven) ||
    (record.type === RecordType.REPAYMENT_RECEIVED && record.repaymentReceived) ||
    (record.type === RecordType.ASSET_SALE && record.assetSale) ||
    (record.type === RecordType.ASSET_PURCHASE && record.assetPurchase) ||
    (record.type === RecordType.ASSET_APPRECIATION_DEPRECIATION && record.assetAppreciationDepreciation)
  );
}

function getInnerKey(record: InferredRecord, key: string) {
  if (record.type === RecordType.EXPENSE && record.expense) return (record.expense as any)[key];
  if (record.type === RecordType.INCOME && record.income) return (record.income as any)[key];
  if (record.type === RecordType.LENDING && record.lending) return (record.lending as any)[key];
  if (record.type === RecordType.BORROWING && record.borrowing) return (record.borrowing as any)[key];
  if (record.type === RecordType.REPAYMENT_GIVEN && record.repaymentGiven) return (record.repaymentGiven as any)[key];
  if (record.type === RecordType.REPAYMENT_RECEIVED && record.repaymentReceived) return (record.repaymentReceived as any)[key];
  if (record.type === RecordType.ASSET_SALE && record.assetSale) return (record.assetSale as any)[key];
  if (record.type === RecordType.ASSET_PURCHASE && record.assetPurchase) return (record.assetPurchase as any)[key];
  if (record.type === RecordType.ASSET_APPRECIATION_DEPRECIATION && record.assetAppreciationDepreciation)
    return (record.assetAppreciationDepreciation as any)[key];
  return null;
}

function getParty(record: InferredRecord): Party | null {
  let party = getInnerKey(record, "party");
  if (!party) return null;
  return party as Party;
}

function getWallet(record: InferredRecord): Wallet | null {
  let wallet = getInnerKey(record, "wallet");
  if (!wallet) return null;
  return wallet as Wallet;
}

function getAsset(record: InferredRecord): Asset | null {
  let asset = getInnerKey(record, "asset");
  if (!asset) return null;
  return asset as Asset;
}

function getNumber(record: InferredRecord, key: string): number | null {
  let value = getInnerKey(record, key);
  return value;
}

function getString(record: InferredRecord, key: string): string | null {
  let value = getInnerKey(record, key);
  return value;
}

function isPotentialDuplicate(record: InferredRecord): boolean {
  return duplicateIds.value.has(record._id || "");
}

// ----- Watchers

watch(paginationCurrentPage, (_currentPage, _previousPage) => {
  console.debug("paginationCurrentPage", paginationCurrentPage);
  loadData("pagination");
});

// ----- Execution

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.filters-activated-area {
  display: flex;
  align-items: center;
  font-size: 12px;
  margin-bottom: 12px;
  color: #3d3d3d;
  background-color: #f3f3f3;
  padding: 8px;
  border-radius: 4px;
}

body.body--dark .filters-activated-area {
  color: #cbd5e1; // slate-300
  background-color: rgba(30, 37, 56, 0.6); // Dark surface variant with transparency
  border: 1px solid rgba(255, 255, 255, 0.05);
}

body.body--dark .record-row .details-section .tags-line .record-type[data-record-type="expense"] {
  background-color: #2e1a1e !important;
  color: #ffb4ab;
}

body.body--dark .record-row .details-section .tags-line .record-type[data-record-type="lending"] {
  background-color: #2e1a2e !important;
  color: #ffb4ff; // Matching expense text lightness/saturation but in purple
}

body.body--dark .record-row .details-section .tags-line .record-type[data-record-type="borrowing"] {
  background-color: #1e1a2e !important;
  color: #b4b4ff; // Matching expense text lightness/saturation but in blue
}

.record-row {
  .record-date {
    font-size: 10px;

    .duplicate-flag {
      color: #a61c1c;
      margin-left: 4px;
      font-size: 12px;
      animation: pulse 2s infinite;
    }
  }

  body.body--dark & .record-date {
    color: #94a3b8; // slate-400 for better readability

    .duplicate-flag {
      color: #f87171; // Soft red for dark mode
    }
  }

  .details-section {
    flex: 1;

    .primary-line {
      font-size: 16px;
    }

    .tags-line {
      margin-left: -5px;
      .record-type {
        &[data-record-type="expense"] {
          background-color: $record-expense-primary-color;
          color: $record-expense-text-color;
        }

        &[data-record-type="income"] {
          background-color: $record-income-primary-color;
          color: $record-income-text-color;
        }

        &[data-record-type="lending"],
        &[data-record-type="repayment-received"] {
          background-color: $record-lending-primary-color;
          color: $record-lending-text-color;
        }

        &[data-record-type="borrowing"],
        &[data-record-type="repayment-given"] {
          background-color: $record-borrowing-primary-color;
          color: $record-borrowing-text-color;
        }
      }

      .tag {
        font-size: 12px;
        padding: 2px 6px;
        display: inline-block;
        border-radius: 6px;
        background-color: #666666;
        color: rgb(245, 245, 245);
        margin-left: 4px;
      }

      body.body--dark & .tag {
        background-color: rgba(30, 37, 56, 0.8);
        color: #cbd5e1; // slate-300
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
    }
  }

  .amounts-section {
    text-align: right;

    .amount {
      font-size: 24px;
      display: inline-block;
    }

    .wallet {
      font-size: 10px;
    }

    .controls {
      .control-button {
        margin: 2px;
      }
    }
  }
}

.money-transfer-row {
  .amount-left-col {
    margin-right: 12px;
  }

  td {
    vertical-align: top;
  }

  @media (max-width: $breakpoint-xs-max) {
    .amount-left-col {
      margin-right: 0px;
    }

    .amounts-section-row {
      flex-direction: column;
    }

    .amount-col {
      margin-bottom: 8px;
    }
  }
}

.party-type {
  text-transform: capitalize;
}

.month-and-year-input-wrapper {
  text-align: center;
}

.amount-in {
  color: #4caf50;
}

.amount-out {
  color: #ef5350;
}

.quick-summary-title {
  font-size: 16px;
  padding-top: 8px;
  padding-bottom: 8px;
  text-align: right;
}

.quick-summary-table {
  font-size: 12px;
  margin-bottom: 0px;
}

.username {
  font-size: 10px;
  text-transform: capitalize;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.divider-line-date {
  font-size: 10px;
  color: #666666;
  text-align: center;
  margin-top: -8px;
}

.divider-line-inner {
  background-color: #fff;
  padding: 0px 8px;
  display: inline-block;
  border-radius: 8px;
}

.divider-line-different-day {
  border-top: 1px dashed #bdbdbd;
  margin-top: 24px;
  margin-bottom: 8px;
}

body.body--dark {
  .divider-line-date {
    color: #94a3b8; // slate-400
  }

  .divider-line-inner {
    background-color: #1e2538; // Dark surface variant
    color: #cbd5e1; // slate-300
  }

  .divider-line-different-day {
    border-top: 1px dashed rgba(255, 255, 255, 0.1); // Subtle border for dark mode
  }
}

.divider-line-same-day {
  // border-top: 1px dashed #eaeaea;
  margin-top: 4px;
  // margin-bottom: 12px;
}

.expense-avenue {
  font-weight: bold;
  font-size: 18px;
}
</style>
