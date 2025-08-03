<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Document" @click="addDocumentClicked" />
      </div>

      <div class="q-pa-md">
        <!-- @vue-expect-error -->
        <q-table
          :loading="isLoading"
          title="Documents"
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
          style="font-family: 'Courier New', Courier, monospace"
        >
          <template v-slot:top-right>
            <q-input outlined rounded dense clearable debounce="1" v-model="searchFilter" label="Search by content" placeholder="Search" class="search-field">
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

      <div class="title-row q-pa-md q-gutter-sm">
        <q-btn color="red" text-color="white" label="Remove All Local Data" @click="removeLocalDataClicked" />
        <q-btn color="secondary" text-color="white" label="Download All Local Data" @click="downloadLocalDataClicked" />
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { dataBackupService } from "src/services/data-backup-service";
import { dialogService } from "src/services/dialog-service";
import { localDataService } from "src/services/local-data-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { ref, watch, type Ref } from "vue";
import AddDocument from "./../components/AddDocument.vue";
import { rowsPerPageOptions } from "./../constants/constants";

type EditableDocument = {
  _id: string;
  collection: string;
  content: string;
  modifiedEpoch: number;
};

const $q = useQuasar();

const searchFilter: Ref<string | null> = ref(null);

const isLoading = ref(false);

const columns = [
  {
    name: "_id",
    required: true,
    label: "ID",
    align: "left",
    field: "_id",
    sortable: false,
  },
  {
    name: "collection",
    required: true,
    label: "Collection",
    align: "left",
    field: "collection",
    sortable: true,
  },
  {
    name: "modifiedEpoch",
    label: "Modified Epoch",
    sortable: true,
    field: "modifiedEpoch",
  },
  {
    name: "content",
    align: "left",
    label: "Content",
    sortable: true,
    field: (doc: EditableDocument) => {
      return String(doc.content).slice(0, 80) + "...";
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
  sortBy: "modifiedEpoch",
  descending: false,
  page: 1,
  rowsPerPage: paginationSizeStore.paginationSize,
  rowsNumber: 0,
});

function applyOrdering(docList: EditableDocument[], sortBy: string, descending: boolean) {
  if (sortBy === "collection") {
    docList.sort((a, b) => {
      return a.collection.localeCompare(b.collection) * (descending ? -1 : 1);
    });
  } else if (sortBy === "modifiedEpoch") {
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

  let res = await pouchdbService.listDocs();

  let docList: EditableDocument[] = res.rows.map((row) => {
    let collection = "ERROR";
    try {
      collection = (row.doc as any).$collection || "NOT_FOUND";
    } catch (ex) {}
    return {
      _id: row.id,
      collection,
      modifiedEpoch: (row.doc as any)?.modifiedEpoch || 0,
      content: JSON.stringify(row.doc!),
    };
  });

  if (searchFilter.value) {
    let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
    docList = docList.filter((doc) => regex.test(doc.content));
  }

  applyOrdering(docList, sortBy, descending);

  let totalRowCount = docList.length;
  let currentRows = docList.slice(skip, skip + limit);

  console.debug({ currentRows });
  rows.value = currentRows;

  pagination.value.rowsNumber = totalRowCount;
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;
  pagination.value.sortBy = sortBy;
  pagination.value.descending = descending;

  isLoading.value = false;
}

async function addDocumentClicked() {
  $q.dialog({ component: AddDocument }).onOk(() => {
    loadData();
  });
}

async function loadData() {
  dataForTableRequested(null);
}

async function editClicked(doc: EditableDocument) {
  $q.dialog({ component: AddDocument, componentProps: { existingDocumentId: doc._id } }).onOk(() => {
    loadData();
  });
}

async function removeLocalDataClicked() {
  localDataService.removeLocalData();
}

async function downloadLocalDataClicked() {
  let jsonData = await dataBackupService.exportAllDataToJson();
  await dataBackupService.initiateFileDownload(jsonData);
}

async function deleteClicked(doc: EditableDocument) {
  let answer = await dialogService.confirm("Remove document", `Are you sure you want to remove the document "${doc._id}"?`);
  if (!answer) return;

  let res = await pouchdbService.removeDoc(JSON.parse(doc.content), true);
  if (!res || !res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the document.");
  }

  loadData();
}

// Initial load
loadData();

// Watch search filter and reload data on change
watch(searchFilter, () => {
  loadData();
});
</script>

<style scoped lang="scss"></style>
