<template>
  <q-page class="row items-start justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <q-btn color="secondary" icon="filter_list" flat round @click="setFiltersClicked" />
        <q-btn color="warning" label="Clear Filters" @click="clearFiltersClicked" v-if="recordFilters" />
        <div class="title">
          <div class="month-and-year-input-wrapper" v-if="!recordFilters && $q.screen.gt.xs">
            <month-and-year-input v-model:month="filterMonth" v-model:year="filterYear" @selection="monthAndYearSelected()"></month-and-year-input>
          </div>
        </div>
        <q-btn-dropdown size="md" color="primary" label="Add Expenses" split @click="addExpenseClicked">
          <q-list>
            <q-item clickable v-close-popup @click="addExpenseFromTemplateClicked">
              <q-item-section>
                <q-item-label>Add Expense from Templates</q-item-label>
              </q-item-section>
            </q-item>
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
          </q-list>
        </q-btn-dropdown>
      </div>

      <div class="q-pa-md" style="padding-top: 0px; margin-top: -8px; margin-bottom: 8px">
        <div class="sub-heading" v-if="recordFilters">Filtered Records</div>
        <div class="month-and-year-input-wrapper" v-if="!recordFilters && $q.screen.lt.sm">
          <month-and-year-input v-model:month="filterMonth" v-model:year="filterYear" @selection="monthAndYearSelected()"></month-and-year-input>
        </div>

        <div class="loading-notifier" v-if="isLoading">
          <q-spinner color="primary" size="32px"></q-spinner>
        </div>
        <template v-if="!isLoading">
          <div v-for="(record, index) in rows" class="record-row" v-bind:key="record._id">
            <!-- Unified Single Amount Record - start -->
            <div class="single-amount-row row" v-if="isSingleAmountType(record)" :data-index="index">
              <div class="details-section">
                <div class="record-date">{{ prettifyDate(record.transactionEpoch) }}</div>

                <div class="primary-line" v-if="record.type === RecordType.EXPENSE">
                  {{ record.expense?.expenseAvenue.name }}
                </div>
                <div class="primary-line" v-else-if="record.type === RecordType.INCOME">
                  {{ record.income?.incomeSource.name }}
                </div>
                <div class="primary-line" v-else-if="getAsset(record)">Asset: {{ getAsset(record)!.name }}</div>

                <div class="row secondary-line">
                  <div class="party" v-if="getParty(record)">
                    <span class="party-type">{{ getParty(record)?.type }}</span
                    >: {{ getParty(record)?.name }}
                  </div>
                </div>

                <div class="notes" v-if="record.notes">Notes: {{ record.notes }}</div>

                <div class="row tags-line">
                  <div class="record-type" :data-record-type="record.type">
                    {{ record.typePrettified }}
                  </div>
                  <div
                    class="tag"
                    v-for="tag in record.tagList"
                    v-bind:key="tag._id"
                    :style="`background-color: ${tag.color}; color: ${guessFontColorCode(tag.color)}`"
                  >
                    {{ tag.name }}
                  </div>
                </div>
              </div>

              <div class="amounts-section">
                <div class="amount">
                  {{ dataInferenceService.getPrintableAmount(getNumber(record, "amount")!, getString(record, "currencyId")!) }}
                </div>
                <div class="wallet" v-if="getWallet(record)">({{ getWallet(record)!.name }})</div>
                <div class="unpaid-amount" v-if="getNumber(record, 'amountUnpaid')! > 0">
                  Unpaid:
                  {{ dataInferenceService.getPrintableAmount(getNumber(record, "amountUnpaid")!, getString(record, "currencyId")!) }}
                </div>
                <div class="controls">
                  <q-btn class="control-button" round color="primary" icon="create" size="8px" @click="editSingleAmountRecordClicked(record)" />
                  <q-btn class="control-button" round color="negative" icon="delete" size="8px" @click="deleteClicked(record)" />
                </div>
              </div>
            </div>
            <!-- Unified Single Amount Record -->

            <!-- Money Transfer - start -->
            <div class="money-transfer-row row" v-else-if="record.type === RecordType.MONEY_TRANSFER && record.moneyTransfer" :data-index="index">
              <div class="details-section">
                <div class="record-date">{{ prettifyDate(record.transactionEpoch) }}</div>

                <div class="primary-line">Transfer {{ record.moneyTransfer.fromWallet.name }} to {{ record.moneyTransfer.toWallet.name }}</div>

                <div class="notes" v-if="record.notes">{{ record.notes }}</div>

                <div class="row tags-line">
                  <div class="record-type" :data-record-type="record.type">
                    {{ record.typePrettified }}
                  </div>
                  <div
                    class="tag"
                    v-for="tag in record.tagList"
                    v-bind:key="tag._id"
                    :style="`background-color: ${tag.color}; color: ${guessFontColorCode(tag.color)}`"
                  >
                    {{ tag.name }}
                  </div>
                </div>
              </div>

              <div class="amounts-section">
                <div class="row amounts-section-row">
                  <div class="amount-col amount-left-col">
                    <div class="amount amount-out">
                      Out {{ dataInferenceService.getPrintableAmount(record.moneyTransfer.fromAmount, record.moneyTransfer.fromCurrencyId) }}
                    </div>
                    <div class="wallet">({{ record.moneyTransfer.fromWallet.name }})</div>
                  </div>
                  <div class="amount-col amount-right-col">
                    <div class="amount amount-in">
                      In {{ dataInferenceService.getPrintableAmount(record.moneyTransfer.toAmount, record.moneyTransfer.toCurrencyId) }}
                    </div>
                    <div class="wallet">({{ record.moneyTransfer.toWallet.name }})</div>
                  </div>
                </div>

                <div class="controls">
                  <q-btn class="control-button" round color="primary" icon="create" size="8px" @click="editMoneyTransferClicked(record)" />
                  <q-btn class="control-button" round color="negative" icon="delete" size="8px" @click="deleteClicked(record)" />
                </div>
              </div>
            </div>
            <!-- Money Transfer -->

            <div class="misc-row" v-else :data-index="index">{{ record }}</div>
          </div>
        </template>

        <div class="q-pa-lg flex flex-center">
          <q-pagination v-model="paginationCurrentPage" :max="paginationMaxPage" input />
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { Ref, ref, watch } from "vue";
import { useQuasar } from "quasar";
import { pouchdbService } from "src/services/pouchdb-service";
import { Record } from "src/models/record";
import { dialogService } from "src/services/dialog-service";
import { Collection, RecordType } from "src/constants/constants";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { dataInferenceService } from "src/services/data-inference-service";
import { guessFontColorCode, prettifyDate } from "src/utils/misc-utils";
import AddExpenseRecord from "src/components/AddExpenseRecord.vue";
import AddIncomeRecord from "src/components/AddIncomeRecord.vue";
import AddMoneyTransferRecord from "src/components/AddMoneyTransferRecord.vue";
import AddRepaymentReceivedRecord from "src/components/AddRepaymentReceivedRecord.vue";
import AddRepaymentGivenRecord from "src/components/AddRepaymentGivenRecord.vue";
import AddLendingRecord from "src/components/AddLendingRecord.vue";
import AddBorrowingRecord from "src/components/AddBorrowingRecord.vue";
import AddAssetPurchaseRecord from "src/components/AddAssetPurchaseRecord.vue";
import AddAssetSaleRecord from "src/components/AddAssetSaleRecord.vue";
import AddAssetAppreciationDepreciationRecord from "src/components/AddAssetAppreciationDepreciationRecord.vue";
import { Party } from "src/models/party";
import { Wallet } from "src/models/wallet";
import { Asset } from "src/models/asset";
import { RecordFilters } from "src/models/inferred/record-filters";
import FilterRecordsDialog from "src/components/FilterRecordsDialog.vue";
import { normalizeEpochRange } from "src/utils/date-utils";
import SelectTemplateDialog from "src/components/SelectTemplateDialog.vue";
import { useRecordFiltersStore } from "src/stores/record-filters-store";
import MonthAndYearInput from "src/components/lib/MonthAndYearInput.vue";

const recordFiltersStore = useRecordFiltersStore();

const $q = useQuasar();

// ----- Refs
const searchFilter: Ref<string | null> = ref(null);
const isLoading = ref(false);
const rows: Ref<InferredRecord[]> = ref([]);

const recordCountPerPage = 10;
const paginationCurrentPage: Ref<number> = ref(1);
const paginationMaxPage: Ref<number> = ref(1);

const recordFilters: Ref<RecordFilters | null> = ref(recordFiltersStore.recordFilters || null);
recordFiltersStore.setRecordFilters(null);

const filterMonth: Ref<number> = ref(new Date().getMonth());
const filterYear: Ref<number> = ref(new Date().getFullYear());

// ----- Functions

async function loadData() {
  isLoading.value = true;

  await dataInferenceService.updateCurrencyCache();

  let dataRows = (await pouchdbService.listByCollection(Collection.RECORD)).docs as Record[];

  if (recordFilters.value) {
    let { recordTypeList, partyId, tagList, walletId, searchString } = recordFilters.value;
    recordTypeList = recordTypeList.map((type) => (RecordType as any)[type]);
    let [startEpoch, endEpoch] = normalizeEpochRange(recordFilters.value.startEpoch, recordFilters.value.endEpoch);

    if (recordTypeList.length) {
      dataRows = dataRows.filter((record) => recordTypeList.indexOf(record.type) > -1);
    }

    if (tagList.length) {
      dataRows = dataRows.filter((record) => {
        return record.tagIdList.some((tagId) => tagList.includes(tagId));
      });
    }

    if (partyId) {
      dataRows = dataRows.filter(
        (record) =>
          record.income?.partyId === partyId ||
          record.expense?.partyId === partyId ||
          record.assetPurchase?.partyId === partyId ||
          record.assetSale?.partyId === partyId ||
          record.lending?.partyId === partyId ||
          record.borrowing?.partyId === partyId ||
          record.repaymentGiven?.partyId === partyId ||
          record.repaymentReceived?.partyId === partyId
      );
    }
    if (walletId) {
      dataRows = dataRows.filter(
        (record) =>
          record.income?.walletId === walletId ||
          record.expense?.walletId === walletId ||
          record.assetPurchase?.walletId === walletId ||
          record.assetSale?.walletId === walletId ||
          record.lending?.walletId === walletId ||
          record.borrowing?.walletId === walletId ||
          record.repaymentGiven?.walletId === walletId ||
          record.repaymentReceived?.walletId === walletId ||
          record.moneyTransfer?.fromWalletId === walletId ||
          record.moneyTransfer?.toWalletId === walletId
      );
    }

    if (searchString && searchString.length > 0) {
      dataRows = dataRows.filter((record) => record.notes && String(record.notes).indexOf(searchString) > -1);
    }

    dataRows = dataRows.filter((record) => record.transactionEpoch >= startEpoch && record.transactionEpoch <= endEpoch);
  } else {
    let rangeStart = new Date(filterYear.value, filterMonth.value, 1);
    let rangeEnd = new Date(filterYear.value, filterMonth.value, 1);
    rangeEnd.setMonth(rangeEnd.getMonth() + 1);
    rangeEnd.setDate(rangeEnd.getDate() - 1);

    console.log(rangeStart, rangeEnd);

    let [startEpoch, endEpoch] = normalizeEpochRange(rangeStart.getTime(), rangeEnd.getTime());
    dataRows = dataRows.filter((record) => record.transactionEpoch >= startEpoch && record.transactionEpoch <= endEpoch);
  }

  dataRows.sort((a, b) => (b.transactionEpoch || 0) - (a.transactionEpoch || 0));

  paginationMaxPage.value = Math.ceil(dataRows.length / recordCountPerPage);
  if (paginationCurrentPage.value > paginationMaxPage.value) {
    paginationCurrentPage.value = paginationMaxPage.value;
  }

  let startIndex = (paginationCurrentPage.value - 1) * recordCountPerPage;

  let inferredDataRows = await Promise.all(dataRows.map((rawData) => dataInferenceService.inferRecord(rawData)));
  rows.value = inferredDataRows.slice(startIndex, startIndex + recordCountPerPage);

  isLoading.value = false;
}

// ----- Event Handlers

async function monthAndYearSelected() {
  loadData();
}

async function addExpenseClicked() {
  $q.dialog({ component: AddExpenseRecord }).onOk((res) => {
    paginationCurrentPage.value = 1;
    loadData();
  });
}

async function addExpenseFromTemplateClicked() {
  $q.dialog({ component: SelectTemplateDialog, componentProps: { templateType: "expense" } }).onOk((selectedTemplate: Record) => {
    $q.dialog({ component: AddExpenseRecord, componentProps: { useTemplateId: selectedTemplate._id } }).onOk((res) => {
      paginationCurrentPage.value = 1;
      loadData();
    });
  });
}

async function addIncomeClicked() {
  $q.dialog({ component: AddIncomeRecord }).onOk((res) => {
    paginationCurrentPage.value = 1;
    loadData();
  });
}

async function addMoneyTransferClicked() {
  $q.dialog({ component: AddMoneyTransferRecord }).onOk((res) => {
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

  $q.dialog({ component, componentProps: { existingRecordId: record._id } }).onOk((res) => {
    loadData();
  });
}

async function editMoneyTransferClicked(record: InferredRecord) {
  $q.dialog({ component: AddMoneyTransferRecord, componentProps: { existingRecordId: record._id } }).onOk((res) => {
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

async function setFiltersClicked() {
  $q.dialog({ component: FilterRecordsDialog, componentProps: { inputFilters: recordFilters.value } }).onOk((res: RecordFilters) => {
    recordFilters.value = res;
    loadData();
  });
}

async function clearFiltersClicked() {
  recordFilters.value = null;
  loadData();
}

// ----- Computed and Embedded

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

// ----- Watchers

watch(searchFilter, (_, __) => {
  loadData();
});

watch(paginationCurrentPage, (currentPage, previousPage) => {
  loadData();
});

// ----- Execution

loadData();
</script>

<style scoped lang="scss">
.sub-heading {
  font-size: 20px;
  margin-bottom: 12px;
}

.record-row {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #eaeaea;

  .record-date {
    font-size: 10px;
    display: inline-block;
  }

  .details-section {
    flex: 1;

    .primary-line {
      font-size: 16px;
    }

    .tags-line {
      .record-type {
        font-size: 12px;
        padding: 2px 6px;
        display: inline-block;
        border-radius: 6px;
        text-transform: capitalize;
        background-color: #e6e6e6;

        &[data-record-type="expense"] {
          background-color: $record-expense-primary-color;
          color: $record-expense-text-color;
        }

        &[data-record-type="income"] {
          background-color: $record-income-primary-color;
          color: $record-income-text-color;
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

.income-row {
  .amount {
    color: rgb(7, 112, 7);
  }
}

.money-transfer-row {
  .amount-left-col {
    margin-right: 12px;
  }

  .amount-in {
    color: rgb(7, 112, 7);
  }

  .amount-out {
    color: rgb(112, 7, 7);
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
</style>
