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
              <q-btn-dropdown size="sm" color="primary" label="View Records" split @click="viewRecordsClicked(rowWrapper.row)">
                <q-list>
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
import { sleep } from "src/utils/misc-utils";
import { Currency } from "src/models/currency";
import { Party } from "src/models/party";
import { Record } from "src/models/record";
import AddLendingRecord from "src/components/AddLendingRecord.vue";
import AddBorrowingRecord from "src/components/AddBorrowingRecord.vue";
import AddRepaymentReceivedRecord from "src/components/AddRepaymentReceivedRecord.vue";
import AddRepaymentGivenRecord from "src/components/AddRepaymentGivenRecord.vue";

type LoanAndDebtSummary = {
  partyId: string;
  partyName: string;
  totalLoansGivenToParty: number;
  totalLoansTakenFromParty: number;
  totalRepaidToParty: number;
  totalRepaidByParty: number;
  totalOwedToParty: number;
  totalOwedByParty: number;
  currencyId: string;
  currencySign: string;
};

export default defineComponent({
  name: "WalletsPage",
  components: {},
  setup() {
    const $q = useQuasar();

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
        name: "totalLoansGivenToParty",
        align: "left",
        label: "Loans Given to Party",
        sortable: true,
        field: "totalLoansGivenToParty",
      },
      {
        name: "totalLoansTakenFromParty",
        align: "left",
        label: "Loans Taken from Party",
        sortable: true,
        field: "totalLoansTakenFromParty",
      },
      {
        name: "totalRepaidByParty",
        align: "left",
        label: "Repaid by Party",
        sortable: true,
        field: "totalRepaidByParty",
      },
      {
        name: "totalRepaidToParty",
        align: "left",
        label: "Repaid By Party",
        sortable: true,
        field: "totalRepaidToParty",
      },
      {
        name: "totalOwedByParty",
        align: "left",
        label: "Party owes you",
        sortable: true,
        field: "totalOwedByParty",
      },
      {
        name: "totalOwedToParty",
        align: "left",
        label: "You owe party",
        sortable: true,
        field: "totalOwedToParty",
      },
      {
        name: "currency",
        align: "left",
        label: "Currency",
        sortable: true,
        field: "currencySign",
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

      let res = await pouchdbService.listByCollection(Collection.PARTY);
      let partyList = res.docs as Party[];

      let res2 = await pouchdbService.listByCollection(Collection.RECORD);
      let recordList = res2.docs as Record[];

      let res3 = await pouchdbService.listByCollection(Collection.CURRENCY);
      let currencyList = res3.docs as Currency[];

      let loanAndDebtSummaryList: LoanAndDebtSummary[] = [];

      for (let currency of currencyList) {
        for (let party of partyList) {
          let partyId = party._id!;

          let totalLoansGivenToParty = recordList
            .filter((record) => record.type === RecordType.LENDING && record.lending?.partyId === partyId && record.lending?.currencyId === currency._id)
            .reduce((sum, record) => sum + record.lending!.amount, 0);

          let totalLoansTakenFromParty = recordList
            .filter((record) => record.type === RecordType.BORROWING && record.borrowing?.partyId === partyId && record.borrowing?.currencyId === currency._id)
            .reduce((sum, record) => sum + record.borrowing!.amount, 0);

          let totalRepaidToParty = recordList
            .filter(
              (record) =>
                record.type === RecordType.REPAYMENT_GIVEN && record.repaymentGiven?.partyId === partyId && record.repaymentGiven?.currencyId === currency._id
            )
            .reduce((sum, record) => sum + record.repaymentGiven!.amount, 0);

          let totalRepaidByParty = recordList
            .filter(
              (record) =>
                record.type === RecordType.REPAYMENT_RECEIVED &&
                record.repaymentReceived?.partyId === partyId &&
                record.repaymentReceived?.currencyId === currency._id
            )
            .reduce((sum, record) => sum + record.repaymentReceived!.amount, 0);

          let totalOwedToParty = totalLoansTakenFromParty - totalLoansGivenToParty + totalRepaidByParty - totalRepaidToParty;
          let totalOwedByParty = 0;
          if (totalOwedToParty < 0) {
            totalOwedByParty = totalOwedToParty * -1;
            totalOwedToParty = 0;
          }

          let summary: LoanAndDebtSummary = {
            partyId,
            partyName: party.name,
            totalLoansGivenToParty,
            totalLoansTakenFromParty,
            totalRepaidByParty,
            totalRepaidToParty,
            totalOwedToParty,
            totalOwedByParty,
            currencyId: currency._id!,
            currencySign: currency.sign,
          };

          if (summary.totalLoansGivenToParty > 0 || summary.totalLoansTakenFromParty > 0 || summary.totalOwedToParty > 0 || summary.totalOwedByParty > 0) {
            loanAndDebtSummaryList.push(summary);
          }
        }
      }

      let docList = loanAndDebtSummaryList;
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

    async function viewRecordsClicked(summary: LoanAndDebtSummary) {
      // $q.dialog({ component: AddWallet, componentProps: { existingWalletId: wallet._id } }).onOk((res) => {
      //   loadData();
      // });
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
      addRepaymentGivenRecordClicked,
      addRepaymentReceivedRecordClicked,
      pagination,
      dataForTableRequested,
    };
  },
});
</script>

<style scoped lang="scss"></style>
