<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Party" @click="addPartyClicked" />
      </div>

      <div class="q-pa-md">
        <!-- @vue-expect-error -->
        <q-table
          :loading="isLoading"
          title="Parties & Vendors"
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
              <q-btn-dropdown size="sm" color="primary" label="Edit" split @click="editClicked(rowWrapper.row)">
                <q-list>
                  <q-item clickable v-close-popup @click="viewRecordsClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>View Records</q-item-label>
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
import { RecordFilters } from "src/models/inferred/record-filters";
import { Party } from "src/models/party";
import { dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { useRecordFiltersStore } from "src/stores/record-filters-store";
import { ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";
import AddParty from "./../components/AddParty.vue";
import { Collection, partyTypeList, rowsPerPageOptions } from "./../constants/constants";

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
    name: "type",
    align: "left",
    label: "Type",
    sortable: true,
    field: (party: Party) => {
      return partyTypeList.find((partyType) => partyType.value === party.type)?.label;
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

function applyOrdering(docList: Party[], sortBy: string, descending: boolean) {
  if (sortBy === "name") {
    docList.sort((a, b) => {
      return a.name.localeCompare(b.name) * (descending ? -1 : 1);
    });
  } else if (sortBy === "type") {
    docList.sort((a, b) => {
      return b.type.localeCompare(a.type) * (descending ? -1 : 1);
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

  let res = await pouchdbService.listByCollection(Collection.PARTY);
  let docList = res.docs as Party[];
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

async function addPartyClicked() {
  $q.dialog({ component: AddParty }).onOk(() => {
    loadData();
  });
}

async function loadData() {
  dataForTableRequested(null);
}

async function editClicked(party: Party) {
  $q.dialog({ component: AddParty, componentProps: { existingPartyId: party._id } }).onOk(() => {
    loadData();
  });
}

async function deleteClicked(party: Party) {
  let answer = await dialogService.confirm("Remove party", `Are you sure you want to remove the party "${party.name}"?`);
  if (!answer) return;

  let res = await pouchdbService.removeDoc(party);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the party.");
  }

  loadData();
}

async function viewRecordsClicked(party: Party) {
  let recordFilter: RecordFilters = {
    startEpoch: 0,
    endEpoch: Date.now(),
    recordTypeList: [],
    partyId: party._id,
    tagIdWhiteList: [],
    tagIdBlackList: [],
    searchString: "",
    deepSearchString: "",
    sortBy: "transactionEpochDesc",
    type: "parties",
    _partyName: party.name,
    _preset: "custom",
  };
  recordFiltersStore.setRecordFilters(recordFilter);
  router.push({ name: "records" });
}

// Initial data load
loadData();

// Watch for search filter changes
watch(searchFilter, () => {
  loadData();
});
</script>

<style scoped lang="scss"></style>
