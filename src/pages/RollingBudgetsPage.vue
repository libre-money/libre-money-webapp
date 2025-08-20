<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="secondary" text-color="white" label="View Unbudgeted" @click="viewUnbudgetedRecordsClicked" />
        <q-btn color="primary" text-color="white" label="Add Rolling Budget" @click="addBudgetClicked" />
      </div>

      <div class="q-pa-md">
        <!-- @vue-expect-error -->
        <q-table
          :loading="isLoading"
          title="Rolling Budgets"
          :rows="rows"
          :columns="columns"
          row-key="_id"
          flat
          bordered
          :rows-per-page-options="rowsPerPageOptions"
          binary-state-sort
          v-model:pagination="pagination"
          @request="dataForTableRequested"
          class="std-table-non-morphing"
        >
          <template v-slot:top-right>
            <q-input outlined rounded dense clearable debounce="1" v-model="searchFilter" label="Search by name" placeholder="Search" class="search-field">
              <template v-slot:prepend>
                <q-btn icon="search" flat round @click="dataForTableRequested" />
              </template>
            </q-input>
          </template>

          <template v-slot:body-cell-actions="rowWrapper">
            <q-td :props="rowWrapper">
              <q-btn-dropdown size="sm" color="primary" label="Records" split @click="viewRecordsClicked(rowWrapper.row)">
                <q-list>
                  <q-item clickable v-close-popup @click="editClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Edit</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="duplicateClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Duplicate</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="deleteClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Delete</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </q-td>
          </template>
        </q-table>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { UNBUDGETED_RECORDS_BUDGET_NAME } from "src/constants/config-constants";
import { Currency } from "src/models/currency";
import { RecordFilters } from "src/models/inferred/record-filters";
import { RollingBudget } from "src/models/rolling-budget";
import { computationService } from "src/services/computation-service";
import { dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { rollingBudgetService } from "src/services/rolling-budget-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { useRecordFiltersStore } from "src/stores/record-filters-store";
import { printAmount } from "src/utils/de-facto-utils";
import { prettifyDate } from "src/utils/misc-utils";
import { ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";
import AddRollingBudget from "./../components/AddRollingBudget.vue";
import { Collection, RecordType, rowsPerPageOptions } from "./../constants/constants";

const $q = useQuasar();
const recordFiltersStore = useRecordFiltersStore();
const router = useRouter();

const searchFilter: Ref<string | null> = ref(null);
const isLoading = ref(false);

const columns = [
  {
    name: "name",
    required: true,
    label: "Name",
    align: "left",
    field: "name",
    sortable: true,
  },
  {
    name: "currentPeriod",
    align: "left",
    label: "Current Period",
    sortable: false,
    field: (rollingBudget: RollingBudget) => {
      const period = rollingBudget.budgetedPeriodList.find((period) => {
        return period.startEpoch <= Date.now() && period.endEpoch >= Date.now();
      });
      if (!period) return "None";
      return `${prettifyDate(period.startEpoch)} - ${prettifyDate(period.endEpoch)}`;
    },
  },
  {
    name: "used",
    align: "left",
    label: "Used",
    sortable: false,
    field: (rollingBudget: RollingBudget) => {
      const period = rollingBudget.budgetedPeriodList.find((period) => period.startEpoch <= Date.now() && period.endEpoch >= Date.now());
      if (!period) return "N/A";
      return printAmount(period.usedAmount, rollingBudget.currencyId);
    },
  },
  {
    name: "limit",
    align: "left",
    label: "Limit",
    sortable: false,
    field: (rollingBudget: RollingBudget) => {
      const period = rollingBudget.budgetedPeriodList.find((period) => period.startEpoch <= Date.now() && period.endEpoch >= Date.now());
      if (!period) return "N/A";
      return printAmount(period.totalAllocatedAmount, rollingBudget.currencyId);
    },
  },
  {
    name: "actions",
    label: "Actions",
  },
];

const rows: Ref<any[]> = ref([]);

const paginationSizeStore = usePaginationSizeStore();
const pagination = ref({
  sortBy: "status",
  descending: false,
  page: 1,
  rowsPerPage: paginationSizeStore.paginationSize,
  rowsNumber: 0,
});

function applyOrdering(docList: RollingBudget[], sortBy: string, descending: boolean) {
  if (sortBy === "name") {
    docList.sort((a, b) => {
      return a.name.localeCompare(b.name) * (descending ? -1 : 1);
    });
  }
  return docList;
}

async function dataForTableRequested(props: any) {
  let inputPagination = props?.pagination || pagination.value;

  const { page, rowsPerPage, sortBy, descending } = inputPagination;
  paginationSizeStore.setPaginationSize(rowsPerPage);

  isLoading.value = true;

  const skip = (page - 1) * rowsPerPage;
  const limit = rowsPerPage;

  let res = await pouchdbService.listByCollection(Collection.ROLLING_BUDGET);
  let docList = res.docs as RollingBudget[];

  await Promise.all(docList.map(computationService.computeUsedAmountForRollingBudgetInPlace));

  if (searchFilter.value) {
    let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
    docList = docList.filter((doc) => regex.test(doc.name));
  }

  applyOrdering(docList, sortBy, descending);

  let totalRowCount = docList.length;
  let currentRows = docList.slice(skip, skip + limit);

  let currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
  currentRows.forEach((row) => {
    row._currencySign = currencyList.find((currency) => currency._id === row.currencyId)?.sign;
  });

  console.debug({ currentRows });
  rows.value = currentRows;

  pagination.value.rowsNumber = totalRowCount;
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;
  pagination.value.sortBy = sortBy;
  pagination.value.descending = descending;

  isLoading.value = false;
}

async function addBudgetClicked() {
  $q.dialog({ component: AddRollingBudget }).onOk(() => {
    loadData();
  });
}

async function loadData() {
  dataForTableRequested(null);
}

async function editClicked(rollingBudget: RollingBudget) {
  $q.dialog({ component: AddRollingBudget, componentProps: { existingBudgetId: rollingBudget._id } }).onOk(() => {
    loadData();
  });
}

async function deleteClicked(rollingBudget: RollingBudget) {
  let answer = await dialogService.confirm("Remove budget", `Are you sure you want to remove the budget "${rollingBudget.name}"?`);
  if (!answer) return;

  let res = await pouchdbService.removeDoc(rollingBudget);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the budget.");
  }

  loadData();
}

// Initial load
loadData();

// Watch search filter and reload data on change
watch(searchFilter, () => {
  loadData();
});

function duplicateClicked(rollingBudget: RollingBudget) {
  $q.dialog({ component: AddRollingBudget, componentProps: { prefill: rollingBudget } }).onOk(() => {
    loadData();
  });
}

function viewRecordsClicked(rollingBudget: RollingBudget) {
  recordFiltersStore.setRecordFilters(rollingBudgetService.createRecordFiltersForRollingBudget(rollingBudget));
  router.push({ name: "records" });
}

function viewUnbudgetedRecordsClicked() {
  let recordFilter: RecordFilters = {
    startEpoch: 0,
    endEpoch: Date.now(),
    recordTypeList: [RecordType.EXPENSE, RecordType.ASSET_PURCHASE],
    tagIdWhiteList: [],
    tagIdBlackList: [],
    partyId: null,
    currencyId: null,
    walletId: null,
    expenseAvenueId: null,
    incomeSourceId: null,
    assetId: null,
    searchString: "",
    deepSearchString: "",
    sortBy: "transactionEpochDesc",
    type: "budget",
    _budgetName: UNBUDGETED_RECORDS_BUDGET_NAME,
    _preset: "custom",
  };
  recordFiltersStore.setRecordFilters(recordFilter);
  router.push({ name: "records" });
}
</script>

<style scoped lang="scss"></style>
