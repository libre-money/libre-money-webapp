<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Tag" @click="addTagClicked" />
      </div>

      <!-- @vue-expect-error -->
      <q-table
        :loading="isLoading"
        title="Tags"
        :rows="rows"
        :columns="columns"
        row-key="_id"
        flat
        :bordered="!$q.dark.isActive"
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

        <template v-slot:body-cell-name="rowWrapper">
          <q-td :props="rowWrapper">
            <div>
              <q-badge :style="{ color: rowWrapper.row.color }" :label="rowWrapper.row.name" outline />
            </div>
            <!-- <div class="my-table-details">
                {{ rowWrapper.row.name }}
              </div> -->
          </q-td>
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
import { Tag } from "src/schemas/tag";
import { dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { ref, watch, type Ref } from "vue";
import AddTag from "./../components/AddTag.vue";
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
    name: "color",
    required: true,
    label: "Color",
    align: "left",
    field: "color",
    sortable: false,
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

function applyOrdering(docList: Tag[], sortBy: string, descending: boolean) {
  if (sortBy === "name") {
    docList.sort((a, b) => {
      return a.name.localeCompare(b.name) * (descending ? -1 : 1);
    });
  } else if (sortBy === "color") {
    docList.sort((a, b) => {
      return a.color.localeCompare(b.color) * (descending ? -1 : 1);
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

  let res = await pouchdbService.listByCollection(Collection.TAG);
  let docList = res.docs as Tag[];
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

async function addTagClicked() {
  $q.dialog({ component: AddTag }).onOk(() => {
    loadData();
  });
}

async function loadData() {
  dataForTableRequested(null);
}

async function editClicked(tag: Tag) {
  $q.dialog({ component: AddTag, componentProps: { existingTagId: tag._id } }).onOk(() => {
    loadData();
  });
}

async function deleteClicked(tag: Tag) {
  let answer = await dialogService.confirm("Remove tag", `Are you sure you want to remove the tag "${tag.name}"?`);
  if (!answer) return;

  let res = await pouchdbService.removeDoc(tag);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the tag.");
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
