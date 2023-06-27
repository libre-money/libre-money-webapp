<template>
  <q-page class="row items-center justify-evenly">

    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Party" @click="addPartyClicked" />
      </div>

      <div class="q-pa-md">
        <q-table :loading="isLoading" title="Parties & Vendors" :rows="rows" :columns="columns" row-key="_id" flat
          :grid="$q.screen.lt.sm" bordered :rows-per-page-options="rowsPerPageOptions" binary-state-sort
          v-model:pagination="pagination" @request="dataForTableRequested">

          <template v-slot:top-right>
            <q-input borderless dense clearable debounce="1" v-model="searchFilter" label="Search by name"
              placeholder="Search">
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

<script lang="ts">
import { Ref, defineComponent, ref, watch } from "vue";
import { partyTypeList, rowsPerPageOptions } from "./../constants/constants";
import { useQuasar } from "quasar";
import AddParty from "./../components/AddParty.vue";
import { pouchdbService } from "src/services/pouchdb-service";
import { Party } from "src/models/party";
import { dialogService } from "src/services/dialog-service";
import { sleep } from "src/utils/misc-utils";

export default defineComponent({
  name: "PartyEntitiesPage",
  components: {},
  setup() {

    const $q = useQuasar();

    // -----

    const searchFilter: Ref<string | null> = ref(null);

    const isLoading = ref(false);

    const columns = [
      {
        name: "name",
        required: true,
        label: "Name",
        align: "left",
        field: "name",
        sortable: true
      },
      {
        name: "type", align: "left", label: "Type", sortable: true,
        field: ((party: Party) => {
          return partyTypeList.find(partyType => partyType.value === party.type)?.label;
        }),
      },
      {
        name: "actions",
        label: "Actions"
      }
    ];

    let rows: Ref<any[]> = ref([]);

    const pagination = ref({
      sortBy: 'name',
      descending: false,
      page: 1,
      rowsPerPage: 5,
      rowsNumber: 0
    });

    // -----

    async function dataForTableRequested(props: any) {

      let inputPagination = props?.pagination || pagination.value;

      const { page, rowsPerPage, sortBy, descending } = inputPagination;

      isLoading.value = true;

      const skip = (page - 1) * rowsPerPage;
      const limit = rowsPerPage;

      let res = await pouchdbService.listByCollection("party");
      let docList = res.docs as Party[];
      if (searchFilter.value) {
        let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
        docList = docList.filter(doc => regex.test(doc.name));
      }
      docList.sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name) * (descending ? -1 : 1);
        } else if (sortBy === "type") {
          return b.type.localeCompare(a.type) * (descending ? -1 : 1);
        } else {
          return 0;
        }
      });

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
      $q.dialog({ component: AddParty }).onOk((res) => {
        loadData();
      });
    }

    async function loadData() {
      dataForTableRequested(null);
    }

    async function editClicked(party: Party) {
      $q.dialog({ component: AddParty, componentProps: { existingPartyId: party._id } }).onOk((res) => {
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

    // -----

    loadData();

    // -----

    watch(searchFilter, (_, __) => {
      loadData();
    });

    return {
      addPartyClicked,
      searchFilter,
      rowsPerPageOptions, columns, rows,
      isLoading,
      editClicked,
      deleteClicked,
      pagination,
      dataForTableRequested
    };
  }
});
</script>


<style scoped lang="scss">
.std-card {
  min-width: 300px;
  max-width: 900px;
  width: 100%;
  margin: 12px;

  .title-row {
    display: flex;
    flex-direction: row;
    align-items: center;


    .title {
      flex: 1;
      font-size: 20px;
    }
  }
}
</style>
