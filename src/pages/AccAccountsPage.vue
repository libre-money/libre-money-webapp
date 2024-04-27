<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">


      <div class="q-pa-md">
        <!-- @vue-expect-error -->
        <q-table :loading="isLoading" title="Accounts" :rows="rows" :columns="columns" row-key="_id" flat bordered
          :rows-per-page-options="rowsPerPageOptions" binary-state-sort v-model:pagination="pagination"
          @request="dataForTableRequested" class="std-table-non-morphing">
          <template v-slot:top-right>
            <q-input outlined rounded dense clearable debounce="1" v-model="searchFilter" label="Search by name"
              placeholder="Search" class="search-field">
              <template v-slot:prepend>
                <q-btn icon="search" flat round @click="dataForTableRequested" />
              </template>
            </q-input>
          </template>

          <template v-slot:body-cell-actions="rowWrapper">
            <q-td :props="rowWrapper">
              <q-btn-dropdown size="sm" color="primary" label="Ledger" split @click="ledgerClicked(rowWrapper.row)">
                <q-list>
                  <q-item clickable v-close-popup @click="editClicked(rowWrapper.row)" disable>
                    <q-item-section>
                      <q-item-label>Edit</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="deleteClicked(rowWrapper.row)" disable>
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
import { Collection, rowsPerPageOptions } from "./../constants/constants";
import { useQuasar } from "quasar";
import { pouchdbService } from "src/services/pouchdb-service";
import { dialogService } from "src/services/dialog-service";
import { sleep } from "src/utils/misc-utils";
import { usePaginationSizeStore } from "src/stores/pagination";
import { accountingService } from "src/services/accounting-service";
import { AccAccount } from "src/models/accounting/acc-account";
import { useRouter } from "vue-router";

export default defineComponent({
  name: "AccAccountsPage",
  components: {},
  setup() {
    const $q = useQuasar();
    const router = useRouter();


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
        sortable: true,
      },
      {
        name: "type",
        align: "left",
        label: "Type",
        sortable: true,
        field: (account: AccAccount) => {
          return account.type;
        },
      },
      {
        name: "actions",
        label: "Actions",
      },
    ];

    let rows: Ref<any[]> = ref([]);

    const paginationSizeStore = usePaginationSizeStore();
    const pagination = ref({
      sortBy: "name",
      descending: false,
      page: 1,
      rowsPerPage: paginationSizeStore.paginationSize,
      rowsNumber: 0,
    });

    // -----

    async function dataForTableRequested(props: any) {
      let inputPagination = props?.pagination || pagination.value;

      const { page, rowsPerPage, sortBy, descending } = inputPagination;
      paginationSizeStore.setPaginationSize(rowsPerPage);

      isLoading.value = true;

      const skip = (page - 1) * rowsPerPage;
      const limit = rowsPerPage;

      const progressNotifierFn = (progressFraction: number) => {
        "pass";
      };
      const { accountList } = await accountingService.initiateAccounting(progressNotifierFn);

      let docList = accountList;
      if (searchFilter.value) {
        let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
        docList = docList.filter((doc) => regex.test(doc.name));
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



    async function loadData() {
      dataForTableRequested(null);
    }

    async function ledgerClicked(account: AccAccount) {
      router.push({ path: `/accounting/ledger/${account.code}` });
    }

    async function editClicked(account: AccAccount) {
      await dialogService.alert("Not allowed", `Editing default account "${account.name}" is not allowed.`);
    }

    async function deleteClicked(account: AccAccount) {
      await dialogService.alert("Not allowed", `Deleting default account "${account.name}" is not allowed.`);

    }

    // -----

    loadData();

    // -----

    watch(searchFilter, (_, __) => {
      loadData();
    });

    return {
      searchFilter,
      rowsPerPageOptions,
      columns,
      rows,
      isLoading,
      ledgerClicked,
      editClicked,
      deleteClicked,
      pagination,
      dataForTableRequested,
    };
  },
});
</script>

<style scoped lang="scss"></style>
