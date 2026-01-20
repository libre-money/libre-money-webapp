<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Import Rule" @click="addRuleClicked" />
      </div>

      <div class="q-pa-md">
        <q-table
          :loading="isLoading"
          title="Text Import Rules"
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

<script setup lang="ts">
import { useQuasar } from "quasar";
import { TextImportRules } from "src/schemas/text-import-rules";
import { dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { ref, watch } from "vue";
import AddTextImportRule from "./../components/AddTextImportRule.vue";
import { Collection, rowsPerPageOptions } from "./../constants/constants";

const $q = useQuasar();

const searchFilter = ref<string | null>(null);
const isLoading = ref(false);

const columns = [
  {
    name: "name",
    required: true,
    label: "Name",
    align: "left" as const,
    field: "name",
    sortable: true,
  },
  {
    name: "description",
    label: "Description",
    align: "left" as const,
    field: "description",
    sortable: true,
  },
  {
    name: "isActive",
    label: "Active",
    align: "left" as const,
    field: "isActive",
    sortable: true,
  },
  {
    name: "actions",
    label: "Actions",
    field: "actions",
  },
];

const rows = ref<any[]>([]);

const paginationSizeStore = usePaginationSizeStore();
const pagination = ref({
  sortBy: "name",
  descending: false,
  page: 1,
  rowsPerPage: paginationSizeStore.paginationSize,
  rowsNumber: 0,
});

function applyOrdering(docList: TextImportRules[], sortBy: string, descending: boolean) {
  if (sortBy === "name") {
    docList.sort((a, b) => {
      return a.name.localeCompare(b.name) * (descending ? -1 : 1);
    });
  } else if (sortBy === "description") {
    docList.sort((a, b) => {
      const descA = a.description || "";
      const descB = b.description || "";
      return descA.localeCompare(descB) * (descending ? -1 : 1);
    });
  } else if (sortBy === "isActive") {
    docList.sort((a, b) => {
      return (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1) * (descending ? -1 : 1);
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

  let res = await pouchdbService.listByCollection(Collection.TEXT_IMPORT_RULES);
  let docList = res.docs as TextImportRules[];
  if (searchFilter.value) {
    let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
    docList = docList.filter((doc) => regex.test(doc.name) || (doc.description && regex.test(doc.description)));
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

async function addRuleClicked() {
  $q.dialog({ component: AddTextImportRule }).onOk(() => {
    loadData();
  });
}

async function loadData() {
  dataForTableRequested(null);
}

async function editClicked(rule: TextImportRules) {
  if (rule.dissuadeEditing) {
    let answer = await dialogService.confirm("Edit Import Rule", `"${rule.name}" is a system-defined rule. Are you sure you want to edit it?`);
    if (!answer) return;
  }

  $q.dialog({ component: AddTextImportRule, componentProps: { existingRuleId: rule._id } }).onOk(() => {
    loadData();
  });
}

async function deleteClicked(rule: TextImportRules) {
  if (rule.denyDeletion) {
    await dialogService.alert("Error", "This import rule cannot be deleted.");
    return;
  }

  let answer = await dialogService.confirm("Remove Import Rule", `Are you sure you want to remove the Import Rule "${rule.name}"?`);
  if (!answer) return;

  let res = await pouchdbService.removeDoc(rule);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the import rule.");
  }

  loadData();
}

loadData();

watch(searchFilter, () => {
  loadData();
});
</script>

<style scoped lang="scss"></style>
