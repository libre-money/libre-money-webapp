<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Currency" @click="addCurrencyClicked" />
      </div>

      <!-- @vue-expect-error -->
      <q-table
        :loading="isLoading"
        title="Currencies"
        :rows="rows"
        :columns="columns"
        row-key="_id"
        flat
        :bordered="!$q.dark.isActive"
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
            <q-btn-dropdown size="sm" color="primary" label="Edit" split @click="editClicked(rowWrapper.row)">
              <q-list>
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
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { Currency } from "src/schemas/currency";
import { dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { ref, Ref, watch } from "vue";
import AddCurrency from "./../components/AddCurrency.vue";
import { Collection, rowsPerPageOptions } from "./../constants/constants";

const $q = useQuasar();

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
    name: "sign",
    align: "left",
    label: "Sign",
    sortable: true,
    field: "sign",
  },
  {
    name: "actions",
    label: "Actions",
  },
];

const rows: Ref<any[]> = ref([]);

const paginationSizeStore = usePaginationSizeStore();
const pagination = ref({
  sortBy: "name",
  descending: false,
  page: 1,
  rowsPerPage: paginationSizeStore.paginationSize,
  rowsNumber: 0,
});

function applyOrdering(docList: Currency[], sortBy: string, descending: boolean) {
  if (sortBy === "name") {
    docList.sort((a, b) => {
      return a.name.localeCompare(b.name) * (descending ? -1 : 1);
    });
  } else if (sortBy === "sign") {
    docList.sort((a, b) => {
      return b.sign.localeCompare(a.sign) * (descending ? -1 : 1);
    });
  }
}

async function dataForTableRequested(props: any) {
  let inputPagination = props?.pagination || pagination.value;

  const { page, rowsPerPage, sortBy, descending } = inputPagination;
  paginationSizeStore.setPaginationSize(rowsPerPage);

  isLoading.value = true;

  const skip = (page - 1) * rowsPerPage;
  const limit = rowsPerPage;

  let res = await pouchdbService.listByCollection(Collection.CURRENCY);
  let docList = res.docs as Currency[];
  if (searchFilter.value) {
    let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
    docList = docList.filter((doc) => regex.test(doc.name));
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

async function addCurrencyClicked() {
  $q.dialog({ component: AddCurrency }).onOk(() => {
    loadData();
  });
}

async function loadData() {
  dataForTableRequested(null);
}

async function editClicked(currency: Currency) {
  $q.dialog({ component: AddCurrency, componentProps: { existingCurrencyId: currency._id } }).onOk(() => {
    loadData();
  });
}

async function deleteClicked(currency: Currency) {
  let answer = await dialogService.confirm("Remove currency", `Are you sure you want to remove the currency "${currency.name}"?`);
  if (!answer) return;

  let res = await pouchdbService.removeDoc(currency);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the currency.");
  }

  loadData();
}

// Initial load
loadData();

// Watch search filter for changes
watch(searchFilter, () => {
  loadData();
});
</script>

<style scoped lang="scss"></style>
