<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Budget" @click="addBudgetClicked" />
      </div>

      <div class="q-pa-md">
        <!-- @vue-expect-error -->
        <q-table
          :loading="isLoading"
          title="Budgets"
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
              <q-btn-dropdown size="sm" color="primary" label="Records" split @click="viewRecordsClicked(rowWrapper.row)">
                <q-list>
                  <q-item clickable v-close-popup @click="editClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Edit</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="duplicateClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Duplicate</q-item-label>
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

<script lang="ts">
import { useQuasar } from "quasar";
import { Budget } from "src/models/budget";
import { Currency } from "src/models/currency";
import { RecordFilters } from "src/models/inferred/record-filters";
import { computationService } from "src/services/computation-service";
import { dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { useRecordFiltersStore } from "src/stores/record-filters-store";
import { prettifyAmount } from "src/utils/misc-utils";
import { Ref, defineComponent, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AddBudget from "./../components/AddBudget.vue";
import { Collection, RecordType, rowsPerPageOptions } from "./../constants/constants";

export default defineComponent({
  name: "BudgetsPage",
  components: {},
  setup() {
    const $q = useQuasar();
    const recordFiltersStore = useRecordFiltersStore();
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
        name: "status",
        align: "left",
        label: "Status",
        sortable: true,
        field: (budget: Budget) => {
          if (budget.startEpoch > Date.now()) return "Upcoming";
          if (budget.endEpoch < Date.now()) return "Past";
          return "Current";
        },
      },
      {
        name: "used",
        align: "left",
        label: "Used",
        sortable: true,
        field: (budget: Budget) => {
          return `${budget._currencySign!} ${prettifyAmount(budget._usedAmount)} (${printUsedPercentage(budget)})`;
        },
      },
      {
        name: "limit",
        align: "left",
        label: "Limit",
        sortable: true,
        field: (budget: Budget) => {
          return `${budget._currencySign!} ${prettifyAmount(budget.overflowLimit)}`;
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

      let res = await pouchdbService.listByCollection(Collection.BUDGET);
      let docList = res.docs as Budget[];

      await computationService.computeUsedAmountForBudgetListInPlace(docList);

      if (searchFilter.value) {
        let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
        docList = docList.filter((doc) => regex.test(doc.name));
      }
      docList.sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name) * (descending ? -1 : 1);
        } else {
          return 0;
        }
      });

      let totalRowCount = docList.length;
      let currentRows = docList.slice(skip, skip + limit);

      let currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
      currentRows.forEach((row) => {
        row._currencySign = currencyList.find((currency) => currency._id === row.currencyId)?.sign;
      });

      console.debug({ currentRows });
      rows.value = currentRows;

      pagination.value.rowsNumber = totalRowCount;
      pagination.value.page = page;
      pagination.value.rowsPerPage = rowsPerPage;
      pagination.value.sortBy = sortBy;
      pagination.value.descending = descending;

      isLoading.value = false;
    }

    async function addBudgetClicked() {
      $q.dialog({ component: AddBudget }).onOk((res) => {
        loadData();
      });
    }

    async function loadData() {
      dataForTableRequested(null);
    }

    async function editClicked(budget: Budget) {
      $q.dialog({ component: AddBudget, componentProps: { existingBudgetId: budget._id } }).onOk((res) => {
        loadData();
      });
    }

    async function deleteClicked(budget: Budget) {
      let answer = await dialogService.confirm("Remove budget", `Are you sure you want to remove the budget "${budget.name}"?`);
      if (!answer) return;

      let res = await pouchdbService.removeDoc(budget);
      if (!res.ok) {
        await dialogService.alert("Error", "There was an error trying to remove the budget.");
      }

      loadData();
    }

    // -----

    loadData();

    // -----

    watch(searchFilter, (_, __) => {
      loadData();
    });

    function printUsedPercentage(budget: Budget) {
      if (budget.overflowLimit <= 0) {
        return "-";
      }
      return `${Math.round(((budget._usedAmount || 0) / budget.overflowLimit) * 10000) / 100}%`;
    }

    function duplicateClicked(budget: Budget) {
      $q.dialog({ component: AddBudget, componentProps: { prefill: budget } }).onOk((res) => {
        loadData();
      });
    }

    function viewRecordsClicked(budget: Budget) {
      let recordTypeList: string[] = [];
      if (budget.includeExpenses) {
        recordTypeList.push(RecordType.EXPENSE);
      }
      if (budget.includeAssetPurchases) {
        recordTypeList.push(RecordType.ASSET_PURCHASE);
      }

      let recordFilter: RecordFilters = {
        startEpoch: budget.startEpoch,
        endEpoch: budget.endEpoch,
        recordTypeList,
        tagIdWhiteList: budget.tagIdWhiteList,
        tagIdBlackList: budget.tagIdBlackList,
        searchString: "",
        deepSearchString: "",
        sortBy: "transactionEpochDesc",
        type: "budget",
        _budgetName: budget.name,
        _preset: "custom",
      };
      recordFiltersStore.setRecordFilters(recordFilter);
      router.push({ name: "records" });
    }

    return {
      addBudgetClicked,
      searchFilter,
      rowsPerPageOptions,
      columns,
      rows,
      isLoading,
      editClicked,
      deleteClicked,
      pagination,
      dataForTableRequested,
      printUsedPercentage,
      viewRecordsClicked,
      duplicateClicked,
    };
  },
});
</script>

<style scoped lang="scss"></style>
