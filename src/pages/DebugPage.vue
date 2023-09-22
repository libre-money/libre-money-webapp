<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Wallet" @click="addWalletClicked" />
      </div>

      <div class="q-pa-md">
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
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, watch } from "vue";
import { Collection, walletTypeList, rowsPerPageOptions } from "./../constants/constants";
import { useQuasar } from "quasar";
import AddDocument from "./../components/AddDocument.vue";
import { pouchdbService } from "src/services/pouchdb-service";
import { Wallet } from "src/models/wallet";
import { dialogService } from "src/services/dialog-service";
import { sleep } from "src/utils/misc-utils";
import { Currency } from "src/models/currency";

type EditableDocument = {
  _id: string;
  collection: string;
  content: string;
};

export default defineComponent({
  name: "DebugPage",
  components: {},
  setup() {
    const $q = useQuasar();

    // -----

    const searchFilter: Ref<string | null> = ref(null);

    const isLoading = ref(false);

    const columns = [
      {
        name: "_id",
        required: true,
        label: "ID",
        align: "left",
        field: "_id",
        sortable: true,
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

    let rows: Ref<any[]> = ref([]);

    const pagination = ref({
      sortBy: "name",
      descending: false,
      page: 1,
      rowsPerPage: 5,
      rowsNumber: 0,
    });

    // -----

    async function dataForTableRequested(props: any) {
      let inputPagination = props?.pagination || pagination.value;

      const { page, rowsPerPage, sortBy, descending } = inputPagination;

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
          content: JSON.stringify(row.doc!),
        };
      });

      if (searchFilter.value) {
        let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
        docList = docList.filter((doc) => regex.test(doc.content));
      }
      docList.sort((a, b) => {
        if (sortBy === "id") {
          return a._id.localeCompare(b._id) * (descending ? -1 : 1);
        } else {
          return 0;
        }
      });

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

    async function addWalletClicked() {
      $q.dialog({ component: AddDocument }).onOk((res) => {
        loadData();
      });
    }

    async function loadData() {
      dataForTableRequested(null);
    }

    async function editClicked(doc: EditableDocument) {
      $q.dialog({ component: AddDocument, componentProps: { existingDocumentId: doc._id } }).onOk((res) => {
        loadData();
      });
    }

    async function deleteClicked(doc: EditableDocument) {
      let answer = await dialogService.confirm("Remove wallet", `Are you sure you want to remove the document "${doc._id}"?`);
      if (!answer) return;

      let res = await pouchdbService.removeDoc(JSON.parse(doc.content));
      if (!res.ok) {
        await dialogService.alert("Error", "There was an error trying to remove the wallet.");
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
      addWalletClicked,
      searchFilter,
      rowsPerPageOptions,
      columns,
      rows,
      isLoading,
      editClicked,
      deleteClicked,
      pagination,
      dataForTableRequested,
    };
  },
});
</script>

<style scoped lang="scss"></style>
