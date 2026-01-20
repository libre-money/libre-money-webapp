<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-select
          v-model="selectedCurrencyId"
          :options="currencyList"
          option-value="_id"
          option-label="name"
          emit-value
          map-options
          label="Currency"
          standout="bg-primary text-white"
          style="min-width: 200px"
          @update:model-value="loadData"
        >
          <template v-slot:prepend>
            <q-icon name="attach_money" />
          </template>
        </q-select>
      </div>

      <!-- @vue-expect-error -->
      <q-table
        :loading="isLoading"
        title="Consolidated View (All Outstanding Balances)"
        :rows="rows"
        :columns="columns"
        row-key="partyId"
        flat
        :bordered="$q.dark.isActive ? false : true"
        :rows-per-page-options="rowsPerPageOptions"
        binary-state-sort
        v-model:pagination="pagination"
        @request="dataForTableRequested"
        class="std-table-non-morphing"
      >
        <template v-slot:top-right>
          <q-input
            outlined
            rounded
            dense
            clearable
            debounce="300"
            v-model="searchFilter"
            label="Search by name"
            placeholder="Search"
            class="search-field"
          >
            <template v-slot:prepend>
              <q-btn icon="search" flat round @click="dataForTableRequested" />
            </template>
          </q-input>
        </template>

        <template v-slot:body-cell-actions="rowWrapper">
          <q-td :props="rowWrapper">
            <q-btn-dropdown size="sm" color="primary" label="View Details" split @click="viewDetailsClicked(rowWrapper.row)">
              <q-list>
                <q-item clickable v-close-popup @click="viewRecordsClicked(rowWrapper.row)">
                  <q-item-section>
                    <q-item-label>View Records</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </q-td>
        </template>
      </q-table>

      <!-- Empty State -->
      <div v-if="!isLoading && rows.length === 0" class="q-pa-xl text-center text-grey-6">
        <q-icon name="check_circle" size="64px" color="positive" />
        <div class="text-h6 q-mt-md">✨ All Clear!</div>
        <div class="q-mt-sm">You don't have any outstanding balances in {{ selectedCurrencyName }}.</div>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { Collection } from "src/constants/constants";
import { LoanAndDebtSummary } from "src/models/inferred/loan-and-debt-summary";
import { RecordFilters } from "src/models/inferred/record-filters";
import { Currency } from "src/schemas/currency";
import { computationService } from "src/services/computation-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { useRecordFiltersStore } from "src/stores/record-filters-store";
import { useSettingsStore } from "src/stores/settings";
import { printAmount } from "src/utils/de-facto-utils";
import { computed, ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";
import { rowsPerPageOptions } from "./../constants/constants";
import LoansAndDebtsDetailsDialog from "src/components/LoansAndDebtsDetailsDialog.vue";

const $q = useQuasar();
const router = useRouter();
const recordFiltersStore = useRecordFiltersStore();
const settingsStore = useSettingsStore();

const searchFilter: Ref<string | null> = ref(null);
const isLoading = ref(false);
const currencyList: Ref<Currency[]> = ref([]);
const selectedCurrencyId: Ref<string | null> = ref(null);

const selectedCurrencyName = computed(() => {
  const currency = currencyList.value.find((c) => c._id === selectedCurrencyId.value);
  return currency?.name || "";
});

const columns = [
  {
    name: "partyName",
    required: true,
    label: "Party/Vendor",
    align: "left",
    field: "partyName",
    sortable: true,
  },
  {
    name: "totalOwedByParty",
    align: "right",
    label: "They Owe You (Receivables)",
    sortable: true,
    field: (summary: LoanAndDebtSummary) => {
      return printAmount(summary.totalOwedByParty, summary.currencyId);
    },
  },
  {
    name: "totalOwedToParty",
    align: "right",
    label: "You Owe Them (Payables)",
    sortable: true,
    field: (summary: LoanAndDebtSummary) => {
      return printAmount(summary.totalOwedToParty, summary.currencyId);
    },
  },
  {
    name: "netBalance",
    align: "right",
    label: "Net Balance",
    sortable: true,
    field: (summary: LoanAndDebtSummary) => {
      const net = summary.totalOwedByParty - summary.totalOwedToParty;
      return printAmount(net, summary.currencyId);
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
  sortBy: "partyName",
  descending: false,
  page: 1,
  rowsPerPage: paginationSizeStore.paginationSize,
  rowsNumber: 0,
});

function applyOrdering(docList: LoanAndDebtSummary[], sortBy: string, descending: boolean) {
  docList.sort((a, b) => {
    let comparison = 0;
    if (sortBy === "partyName") {
      comparison = a.partyName.localeCompare(b.partyName);
    } else if (sortBy === "totalLoansGivenToParty") {
      comparison = a.totalLoansGivenToParty - b.totalLoansGivenToParty;
    } else if (sortBy === "totalLoansTakenFromParty") {
      comparison = a.totalLoansTakenFromParty - b.totalLoansTakenFromParty;
    } else if (sortBy === "totalRepaidByParty") {
      comparison = a.totalRepaidByParty - b.totalRepaidByParty;
    } else if (sortBy === "totalRepaidToParty") {
      comparison = a.totalRepaidToParty - b.totalRepaidToParty;
    } else if (sortBy === "totalOwedToParty") {
      comparison = a.totalOwedToParty - b.totalOwedToParty;
    } else if (sortBy === "totalOwedByParty") {
      comparison = a.totalOwedByParty - b.totalOwedByParty;
    } else if (sortBy === "netBalance") {
      const netA = a.totalOwedByParty - a.totalOwedToParty;
      const netB = b.totalOwedByParty - b.totalOwedToParty;
      comparison = netA - netB;
    }
    return descending ? -comparison : comparison;
  });
}

async function dataForTableRequested(props: any) {
  let inputPagination = props?.pagination || pagination.value;

  const { page, rowsPerPage, sortBy, descending } = inputPagination;
  paginationSizeStore.setPaginationSize(rowsPerPage);

  isLoading.value = true;

  const skip = (page - 1) * rowsPerPage;
  const limit = rowsPerPage;

  if (!selectedCurrencyId.value) {
    isLoading.value = false;
    return;
  }

  let allSummaries = await computationService.prepareLoanAndDebtSummary();
  
  // Filter by selected currency
  let docList = allSummaries.filter((summary) => summary.currencyId === selectedCurrencyId.value);

  if (searchFilter.value) {
    let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
    docList = docList.filter((doc) => regex.test(doc.partyName));
  }

  applyOrdering(docList, sortBy, descending);

  let totalRowCount = docList.length;
  let currentRows = docList.slice(skip, skip + limit);

  rows.value = currentRows;

  pagination.value.rowsNumber = totalRowCount;
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;
  pagination.value.sortBy = sortBy;
  pagination.value.descending = descending;

  isLoading.value = false;
}

async function loadData() {
  dataForTableRequested(null);
}

async function viewDetailsClicked(summary: LoanAndDebtSummary) {
  $q.dialog({
    component: LoansAndDebtsDetailsDialog,
    componentProps: { summary },
  });
}

async function viewRecordsClicked(summary: LoanAndDebtSummary) {
  let recordFilter: RecordFilters = {
    startEpoch: 0,
    endEpoch: Date.now(),
    recordTypeList: [],
    partyId: summary.partyId,
    currencyId: null,
    walletId: null,
    expenseAvenueId: null,
    incomeSourceId: null,
    assetId: null,
    tagIdWhiteList: [],
    tagIdBlackList: [],
    searchString: "",
    deepSearchString: "",
    sortBy: "transactionEpochDesc",
    type: "loansAndDebts",
    _partyName: summary.partyName,
    _preset: "custom",
  };
  recordFiltersStore.setRecordFilters(recordFilter);
  router.push({ name: "records" });
}

// Initialize
async function initialize() {
  const res = await pouchdbService.listByCollection(Collection.CURRENCY);
  currencyList.value = res.docs as Currency[];
  currencyList.value.sort((a, b) => a.name.localeCompare(b.name));

  // Pre-select default currency or first currency
  if (settingsStore.defaultCurrencyId) {
    selectedCurrencyId.value = settingsStore.defaultCurrencyId;
  } else if (currencyList.value.length > 0) {
    selectedCurrencyId.value = currencyList.value[0]._id!;
  }

  loadData();
}

initialize();

watch(searchFilter, () => {
  loadData();
});
</script>

<style scoped lang="scss"></style>
