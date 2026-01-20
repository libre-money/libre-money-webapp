<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-select v-model="selectedCurrencyId" :options="currencyList" option-value="_id" option-label="name" emit-value
          map-options label="Currency" standout="bg-primary text-white" style="min-width: 200px"
          @update:model-value="loadData">
          <template v-slot:prepend>
            <q-icon name="attach_money" />
          </template>
        </q-select>
      </div>

      <!-- @vue-expect-error -->
      <q-table :loading="isLoading" title="Payables (Bills to Pay)" :rows="rows" :columns="columns" row-key="recordId"
        flat :bordered="$q.dark.isActive ? false : true" :rows-per-page-options="rowsPerPageOptions" binary-state-sort
        v-model:pagination="pagination" @request="dataForTableRequested" class="std-table-non-morphing">
        <template v-slot:top-right>
          <q-input outlined rounded dense clearable debounce="300" v-model="searchFilter" label="Search by party name"
            placeholder="Search" class="search-field">
            <template v-slot:prepend>
              <q-btn icon="search" flat round @click="dataForTableRequested" />
            </template>
          </q-input>
        </template>

        <template v-slot:body-cell-actions="rowWrapper">
          <q-td :props="rowWrapper">
            <q-btn-dropdown size="sm" color="primary" label="Pay" split @click="payNowClicked(rowWrapper.row)">
              <q-list>
                <q-item clickable v-close-popup @click="writeOffClicked(rowWrapper.row)">
                  <q-item-section>
                    <q-item-label>Write Off</q-item-label>
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
        <div class="text-h6 q-mt-md">🎉 All Paid Up!</div>
        <div class="q-mt-sm">You don't have any unpaid expenses or purchases in {{ selectedCurrencyName }}.</div>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { Collection } from "src/constants/constants";
import { PayableItem } from "src/models/inferred/payable-item";
import { Currency } from "src/schemas/currency";
import { computationService } from "src/services/computation-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { useSettingsStore } from "src/stores/settings";
import { printAmount } from "src/utils/de-facto-utils";
import { computed, ref, type Ref } from "vue";
import { rowsPerPageOptions } from "./../constants/constants";
import RecordPayablePayment from "src/components/RecordPayablePaymentDialog.vue";
import WriteOffPayable from "src/components/WriteOffPayableDialog.vue";

const $q = useQuasar();
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
    name: "transactionEpoch",
    required: true,
    label: "Date",
    align: "left",
    field: (item: PayableItem) => new Date(item.transactionEpoch).toLocaleDateString(),
    sortable: true,
  },
  {
    name: "partyName",
    align: "left",
    label: "Party/Vendor",
    field: "partyName",
    sortable: true,
  },
  {
    name: "type",
    align: "left",
    label: "Type",
    field: (item: PayableItem) => (item.type === "expense" ? "Expense" : "Asset Purchase"),
    sortable: true,
  },
  {
    name: "description",
    align: "left",
    label: "Description",
    field: "description",
    sortable: true,
  },
  {
    name: "originalAmount",
    align: "right",
    label: "Original Amount",
    field: (item: PayableItem) => printAmount(item.originalAmount, item.currencyId),
    sortable: true,
  },
  {
    name: "amountPaid",
    align: "right",
    label: "Paid",
    field: (item: PayableItem) => printAmount(item.amountPaid, item.currencyId),
    sortable: true,
  },
  {
    name: "amountUnpaid",
    align: "right",
    label: "Remaining",
    field: (item: PayableItem) => printAmount(item.amountUnpaid, item.currencyId),
    sortable: true,
  },
  {
    name: "actions",
    label: "Actions",
  },
];

const rows: Ref<PayableItem[]> = ref([]);

const paginationSizeStore = usePaginationSizeStore();
const pagination = ref({
  sortBy: "transactionEpoch",
  descending: true,
  page: 1,
  rowsPerPage: paginationSizeStore.paginationSize,
  rowsNumber: 0,
});

function applyOrdering(docList: PayableItem[], sortBy: string, descending: boolean) {
  docList.sort((a, b) => {
    let comparison = 0;
    if (sortBy === "transactionEpoch") {
      comparison = a.transactionEpoch - b.transactionEpoch;
    } else if (sortBy === "partyName") {
      comparison = a.partyName.localeCompare(b.partyName);
    } else if (sortBy === "type") {
      comparison = a.type.localeCompare(b.type);
    } else if (sortBy === "description") {
      comparison = a.description.localeCompare(b.description);
    } else if (sortBy === "originalAmount") {
      comparison = a.originalAmount - b.originalAmount;
    } else if (sortBy === "amountPaid") {
      comparison = a.amountPaid - b.amountPaid;
    } else if (sortBy === "amountUnpaid") {
      comparison = a.amountUnpaid - b.amountUnpaid;
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

  let docList = await computationService.preparePayablesList(selectedCurrencyId.value);

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

async function payNowClicked(item: PayableItem) {
  $q.dialog({
    component: RecordPayablePayment,
    componentProps: { payableItem: item },
  }).onOk(() => {
    loadData();
  });
}

async function writeOffClicked(item: PayableItem) {
  $q.dialog({
    component: WriteOffPayable,
    componentProps: { payableItem: item },
  }).onOk(() => {
    loadData();
  });
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
</script>

<style scoped lang="scss"></style>
