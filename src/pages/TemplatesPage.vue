<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <q-table
        :loading="isLoading"
        title="Templates"
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
            <q-btn-dropdown size="sm" color="primary" label="Use" split @click="applyClicked(rowWrapper.row)">
              <q-list>
                <q-item clickable v-close-popup @click="renameClicked(rowWrapper.row)">
                  <q-item-section>
                    <q-item-label>Rename</q-item-label>
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
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import AddAssetPurchaseRecord from "src/components/AddAssetPurchaseRecord.vue";
import AddExpenseRecord from "src/components/AddExpenseRecord.vue";
import AddIncomeRecord from "src/components/AddIncomeRecord.vue";
import AddMoneyTransferRecord from "src/components/AddMoneyTransferRecord.vue";
import type { Record } from "src/models/record";
import { NotificationType, dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { deepClone } from "src/utils/misc-utils";
import { ref, watch, type Ref } from "vue";
import { Collection, RecordType, rowsPerPageOptions } from "./../constants/constants";

const $q = useQuasar();

const searchFilter: Ref<string | null> = ref(null);
const isLoading = ref(false);

const columns = [
  {
    name: "name",
    required: true,
    label: "Name",
    align: "left" as const,
    field: "templateName",
    sortable: true,
  },
  {
    name: "type",
    align: "left" as const,
    label: "Type",
    sortable: true,
    field: (template: Record) => {
      return template.type;
    },
  },
  {
    name: "actions",
    label: "Actions",
    field: () => "",
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

function applyOrdering(docList: Record[], sortBy: string, descending: boolean) {
  if (sortBy === "name") {
    return docList.sort((a, b) => (a.templateName || "").localeCompare(b.templateName || "") * (descending ? -1 : 1));
  } else if (sortBy === "type") {
    return docList.sort((a, b) => b.type.localeCompare(a.type) * (descending ? -1 : 1));
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

  let res = await pouchdbService.listByCollection(Collection.RECORD_TEMPLATE);
  let docList = res.docs as Record[];
  if (searchFilter.value) {
    let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
    docList = docList.filter((doc) => regex.test(doc.templateName || ""));
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
  await dataForTableRequested(null);
}

async function applyClicked(selectedTemplate: Record) {
  selectedTemplate = deepClone(selectedTemplate);
  console.debug({ selectedTemplate });

  if (selectedTemplate.type === RecordType.EXPENSE) {
    $q.dialog({
      component: AddExpenseRecord,
      componentProps: { useTemplateId: selectedTemplate._id },
    }).onOk(() => {
      dialogService.notify(NotificationType.SUCCESS, "Record saved.");
    });
  } else if (selectedTemplate.type === RecordType.INCOME) {
    $q.dialog({
      component: AddIncomeRecord,
      componentProps: { useTemplateId: selectedTemplate._id },
    }).onOk(() => {
      dialogService.notify(NotificationType.SUCCESS, "Record saved.");
    });
  } else if (selectedTemplate.type === RecordType.MONEY_TRANSFER) {
    $q.dialog({
      component: AddMoneyTransferRecord,
      componentProps: { useTemplateId: selectedTemplate._id },
    }).onOk(() => {
      dialogService.notify(NotificationType.SUCCESS, "Record saved.");
    });
  } else if (selectedTemplate.type === RecordType.ASSET_PURCHASE) {
    $q.dialog({
      component: AddAssetPurchaseRecord,
      componentProps: { useTemplateId: selectedTemplate._id },
    }).onOk(() => {
      dialogService.notify(NotificationType.SUCCESS, "Record saved.");
    });
  }
}

async function deleteClicked(template: Record) {
  let answer = await dialogService.confirm("Remove template", `Are you sure you want to remove the template "${template.templateName}"?`);
  if (!answer) return;

  let res = await pouchdbService.removeDoc(template);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the template.");
  }

  loadData();
}

async function renameClicked(template: Record) {
  let answer = await dialogService.prompt("Rename template", `Enter a new name for the template "${template.templateName}"`, template.templateName || "");
  if (!answer) return;

  template.templateName = answer;
  let res = await pouchdbService.upsertDoc(template);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the template.");
  }

  loadData();
}

// Initial load
loadData();

watch(searchFilter, () => {
  loadData();
});
</script>

<style scoped lang="scss"></style>
