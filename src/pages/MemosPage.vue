<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Memo" @click="addMemoClicked" />
      </div>

      <div class="q-pa-md">
        <!-- @vue-expect-error -->
        <q-table
          :loading="isLoading"
          title="Memos"
          :rows="rows"
          :columns="columns"
          row-key="_id"
          flat
          bordered
          :rows-per-page-options="rowsPerPageOptions"
          binary-state-sort
          v-model:pagination="pagination"
          @request="dataForTableRequested"
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
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { Memo } from "src/schemas/memo";
import { dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { prettifyDateTime } from "src/utils/misc-utils";
import { ref, watch, type Ref } from "vue";
import AddMemo from "./../components/AddMemo.vue";
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
    name: "modified",
    required: true,
    label: "Modified on",
    align: "left",
    field: (memo: Memo) => {
      return `${prettifyDateTime(memo.modifiedEpoch!)}`;
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
  sortBy: "name",
  descending: false,
  page: 1,
  rowsPerPage: paginationSizeStore.paginationSize,
  rowsNumber: 0,
});

function applyOrdering(docList: Memo[], sortBy: string, descending: boolean) {
  if (sortBy === "name") {
    docList.sort((a, b) => {
      return a.name.localeCompare(b.name) * (descending ? -1 : 1);
    });
  } else if (sortBy === "modified") {
    docList.sort((a, b) => {
      return (a.modifiedEpoch! - b.modifiedEpoch!) * (descending ? -1 : 1);
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

  let res = await pouchdbService.listByCollection(Collection.MEMO);
  let docList = res.docs as Memo[];
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

async function addMemoClicked() {
  $q.dialog({ component: AddMemo }).onOk(() => {
    loadData();
  });
}

async function loadData() {
  dataForTableRequested(null);
}

async function editClicked(memo: Memo) {
  $q.dialog({ component: AddMemo, componentProps: { existingMemoId: memo._id } }).onOk(() => {
    loadData();
  });
}

async function deleteClicked(memo: Memo) {
  let answer = await dialogService.confirm("Remove Memo", `Are you sure you want to remove the Memo "${memo.name}"?`);
  if (!answer) return;

  let res = await pouchdbService.removeDoc(memo);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the memo.");
  }

  loadData();
}

// -----

loadData();

// -----

watch(searchFilter, () => {
  loadData();
});
</script>

<style scoped lang="scss"></style>
