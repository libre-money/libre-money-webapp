<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Record Loan Given" @click="addLendingRecord" />
        <q-btn color="primary" text-color="white" label="Record Loan Taken" @click="addBorrowingRecord" />
      </div>

      <div class="q-pa-md">
        <q-table
          :loading="isLoading"
          title="Loans & Debts"
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
              <q-btn-dropdown size="sm" color="primary" label="View Details" split @click="viewDetailsClicked(rowWrapper.row)">
                <q-list>
                  <q-item clickable v-close-popup @click="viewRecordsClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>View Records</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="addRepaymentReceivedRecordClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Record Repayment Received</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="addRepaymentGivenRecordClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Record Repayment Given</q-item-label>
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
import { Collection, walletTypeList, rowsPerPageOptions, RecordType } from "./../constants/constants";
import { useQuasar } from "quasar";
import { pouchdbService } from "src/services/pouchdb-service";
import { Wallet } from "src/models/wallet";
import { dialogService } from "src/services/dialog-service";
import { prettifyAmount, sleep } from "src/utils/misc-utils";
import { Currency } from "src/models/currency";
import { Party } from "src/models/party";
import { Record } from "src/models/record";
import AddLendingRecord from "src/components/AddLendingRecord.vue";
import AddBorrowingRecord from "src/components/AddBorrowingRecord.vue";
import AddRepaymentReceivedRecord from "src/components/AddRepaymentReceivedRecord.vue";
import AddRepaymentGivenRecord from "src/components/AddRepaymentGivenRecord.vue";
import { LoanAndDebtSummary } from "src/models/inferred/loan-and-debt-summary";
import { computationService } from "src/services/computation-service";
import { useRouter } from "vue-router";
import { RecordFilters } from "src/models/inferred/record-filters";
import { useRecordFiltersStore } from "src/stores/record-filters-store";
import LoansAndDebtsDetailsDialog from "src/components/LoansAndDebtsDetailsDialog.vue";
import { usePaginationSizeStore } from "src/stores/pagination";

const recordFiltersStore = useRecordFiltersStore();

export default defineComponent({
  name: "WalletsPage",
  components: {},
  setup() {
    const $q = useQuasar();
    const router = useRouter();

    // -----

    const searchFilter: Ref<string | null> = ref(null);

    const isLoading = ref(false);

    const columns = [
      {
        name: "partyName",
        required: true,
        label: "Party",
        align: "left",
        field: "partyName",
        sortable: true,
      },
      {
        name: "totalOwedByParty",
        align: "left",
        label: "Party owes you",
        sortable: true,
        field: (summary: LoanAndDebtSummary) => {
          return `${summary.currencySign!} ${prettifyAmount(summary.totalOwedByParty)}`;
        },
      },
      {
        name: "totalOwedToParty",
        align: "left",
        label: "You owe party",
        sortable: true,
        field: (summary: LoanAndDebtSummary) => {
          return `${summary.currencySign!} ${prettifyAmount(summary.totalOwedToParty)}`;
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

      let docList = await computationService.prepareLoanAndDebtSummary();

      if (searchFilter.value) {
        let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
        docList = docList.filter((doc) => regex.test(doc.partyName));
      }
      docList.sort((a, b) => {
        if (sortBy === "partyName") {
          return a.partyName.localeCompare(b.partyName) * (descending ? -1 : 1);
        } else if (sortBy === "totalLoansGivenToParty") {
          return b.totalLoansGivenToParty - a.totalLoansGivenToParty * (descending ? -1 : 1);
        } else if (sortBy === "totalLoansTakenFromParty") {
          return b.totalLoansTakenFromParty - a.totalLoansTakenFromParty * (descending ? -1 : 1);
        } else if (sortBy === "totalRepaidByParty") {
          return b.totalRepaidByParty - a.totalRepaidByParty * (descending ? -1 : 1);
        } else if (sortBy === "totalRepaidToParty") {
          return b.totalRepaidToParty - a.totalRepaidToParty * (descending ? -1 : 1);
        } else if (sortBy === "totalOwedToParty") {
          return b.totalOwedToParty - a.totalOwedToParty * (descending ? -1 : 1);
        } else if (sortBy === "totalOwedByParty") {
          return b.totalOwedByParty - a.totalOwedByParty * (descending ? -1 : 1);
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

    async function addLendingRecord() {
      $q.dialog({ component: AddLendingRecord }).onOk((res) => {
        loadData();
      });
    }

    async function addBorrowingRecord() {
      $q.dialog({ component: AddBorrowingRecord }).onOk((res) => {
        loadData();
      });
    }

    async function loadData() {
      dataForTableRequested(null);
    }

    async function viewDetailsClicked(summary: LoanAndDebtSummary) {
      $q.dialog({
        component: LoansAndDebtsDetailsDialog,
        componentProps: { summary },
      });
    }

    async function viewRecordsClicked(summary: LoanAndDebtSummary) {
      let recordFilter: RecordFilters = {
        startEpoch: 0,
        endEpoch: Date.now(),
        recordTypeList: ["LENDING", "BORROWING", "REPAYMENT_GIVEN", "REPAYMENT_RECEIVED"],
        partyId: summary.partyId,
      };
      recordFiltersStore.setRecordFilters(recordFilter);
      router.push({ name: "records" });
    }

    async function addRepaymentReceivedRecordClicked(summary: LoanAndDebtSummary) {
      let suggestedAmount = summary.totalOwedByParty;
      let suggestedPartyId = summary.partyId;
      let suggestedCurrencyId = summary.currencyId;
      $q.dialog({
        component: AddRepaymentReceivedRecord,
        componentProps: { existingRecordId: null, suggestedPartyId, suggestedAmount, suggestedCurrencyId },
      }).onOk((res) => {
        loadData();
      });
    }

    async function addRepaymentGivenRecordClicked(summary: LoanAndDebtSummary) {
      let suggestedAmount = summary.totalOwedToParty;
      let suggestedPartyId = summary.partyId;
      let suggestedCurrencyId = summary.currencyId;
      $q.dialog({
        component: AddRepaymentGivenRecord,
        componentProps: { existingRecordId: null, suggestedPartyId, suggestedAmount, suggestedCurrencyId },
      }).onOk((res) => {
        loadData();
      });
    }

    // -----

    loadData();

    // -----

    watch(searchFilter, (_, __) => {
      loadData();
    });

    return {
      addLendingRecord,
      addBorrowingRecord,
      searchFilter,
      rowsPerPageOptions,
      columns,
      rows,
      isLoading,
      viewRecordsClicked,
      viewDetailsClicked,
      addRepaymentGivenRecordClicked,
      addRepaymentReceivedRecordClicked,
      pagination,
      dataForTableRequested,
    };
  },
});
</script>

<style scoped lang="scss"></style>
