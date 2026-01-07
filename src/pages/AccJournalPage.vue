<template>
  <q-page class="column items-center justify-start">
    <!-- Filter - Start -->
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <q-btn color="secondary" icon="filter_list" flat round @click="setFiltersClicked" />
        <div class="title">
          Journal
          <div class="sub-title" v-if="filters">
            <span v-if="filters.startEpoch === 0">
              <span v-if="journalEntryList.length > 0"> {{ prettifyDate(journalEntryList[0].entryEpoch) }} to {{ prettifyDate(filters.endEpoch) }} </span>
              <span v-else> Up to {{ prettifyDate(filters.endEpoch) }} </span>
            </span>
            <span v-else> {{ prettifyDate(filters.startEpoch) }} to {{ prettifyDate(filters.endEpoch) }} </span>
          </div>
        </div>
      </div>
    </q-card>
    <!-- Filter - End -->

    <q-card class="std-card q-pa-md" :hidden="!isLoading">
      <loading-indicator :is-loading="isLoading" :phases="3" ref="loadingIndicator"></loading-indicator>
    </q-card>

    <!-- Journal - Start -->
    <q-card class="std-card" v-if="!isLoading && journalEntryList.length > 0">
      <q-markup-table bordered wrap-cells separator="cell">
        <thead>
          <tr>
            <th class="text-left" style="width: 140px">Date</th>
            <th class="text-left">Particulars</th>
            <th class="text-right" style="width: 140px">Debit</th>
            <th class="text-right" style="width: 140px">Credit</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="journalEntry in journalEntryList" v-bind:key="journalEntry.serial">
            <template v-for="(debit, debitIndex) in journalEntry.debitList" v-bind:key="`debit-${debit.account?.code}`">
              <tr>
                <td v-if="debitIndex === 0 && journalEntry.debitList.length > 0" :rowspan="getJournalEntryRowCount(journalEntry)" class="date-cell">
                  {{ prettifyDate(journalEntry.entryEpoch) }}
                </td>
                <td class="particulars-cell">
                  {{ debit.account.name }}
                  <span v-if="journalEntry.modality === 'opening'">({{ debit.account.type }})</span>
                </td>
                <td class="text-right debit-cell">
                  {{ printAmount(debit.amount, debit.currencyId) }}
                </td>
                <td class="text-right credit-cell"></td>
              </tr>
            </template>
            <template v-for="(credit, creditIndex) in journalEntry.creditList" v-bind:key="`credit-${credit.account?.code}`">
              <tr>
                <td v-if="creditIndex === 0 && journalEntry.debitList.length === 0" :rowspan="getJournalEntryRowCount(journalEntry)" class="date-cell">
                  {{ prettifyDate(journalEntry.entryEpoch) }}
                </td>
                <td class="particulars-cell">
                  {{ credit.account.name }}
                  <span v-if="journalEntry.modality === 'opening'">({{ credit.account.type }})</span>
                </td>
                <td class="text-right debit-cell"></td>
                <td class="text-right credit-cell">
                  {{ printAmount(credit.amount, credit.currencyId) }}
                </td>
              </tr>
            </template>
            <tr class="notes-row">
              <td v-if="journalEntry.debitList.length === 0 && journalEntry.creditList.length === 0" :rowspan="1" class="date-cell">
                {{ prettifyDate(journalEntry.entryEpoch) }}
              </td>
              <td class="particulars-cell notes-cell">
                <div>{{ journalEntry.description }}</div>
                <div v-if="journalEntry.notes">{{ journalEntry.notes }}</div>
                <div v-if="!journalEntry.isBalanced && !journalEntry.isMultiCurrency" class="fin-warning">Journal entry is NOT balanced.</div>
                <div v-if="!journalEntry.isBalanced && journalEntry.isMultiCurrency" class="fin-multi-currency-note">
                  Journal is multi-currency and thereby is not balanced.
                </div>
              </td>
              <td class="text-right debit-cell"></td>
              <td class="text-right credit-cell"></td>
            </tr>
          </template>
        </tbody>
      </q-markup-table>
    </q-card>
    <!-- Journal - End -->
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import FilterAccJournalDialog from "src/components/FilterAccJournalDialog.vue";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { AccJournalEntry } from "src/models/accounting/acc-journal-entry";
import { AccJournalFilters } from "src/models/accounting/acc-journal-filters";
import { accountingService } from "src/services/accounting-service";
import { printAmount } from "src/utils/de-facto-utils";
import { deepClone, prettifyDate } from "src/utils/misc-utils";
import { Ref, onMounted, ref } from "vue";

const getDefaultFilters = () => {
  return {
    startEpoch: 0,
    endEpoch: Date.now(),
  };
};

const $q = useQuasar();

// ----- Refs
const isLoading = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

let fullJournalEntryList: AccJournalEntry[] = [];
let filteredJournalEntryList: AccJournalEntry[] = [];
const journalEntryList: Ref<AccJournalEntry[]> = ref([]);

const filters: Ref<AccJournalFilters> = ref(getDefaultFilters());

// ----- Functions

function getJournalEntryRowCount(journalEntry: AccJournalEntry): number {
  return journalEntry.debitList.length + journalEntry.creditList.length + 1; // +1 for notes row
}

async function loadData() {
  isLoading.value = true;

  loadingIndicator.value?.startPhase({ phase: 1, weight: 60, label: "Preparing accounting data" });
  const progressNotifierFn = (progressFraction: number) => {
    loadingIndicator.value?.setProgress(progressFraction);
  };
  if (fullJournalEntryList.length === 0) {
    const { accountMap, accountList, journalEntryList } = await accountingService.initiateAccounting(progressNotifierFn);

    fullJournalEntryList = journalEntryList;
    console.debug({ fullJournalEntryList });
  }
  await loadingIndicator.value?.waitMinimalDuration(400);

  loadingIndicator.value?.startPhase({ phase: 2, weight: 20, label: "Applying filters" });
  filteredJournalEntryList = await accountingService.applyJournalFilters(fullJournalEntryList, filters.value);

  journalEntryList.value = filteredJournalEntryList;

  isLoading.value = false;
}

// ----- Event Handlers

async function setFiltersClicked() {
  $q.dialog({ component: FilterAccJournalDialog, componentProps: { inputFilters: deepClone(filters.value) } }).onOk((res: AccJournalFilters) => {
    filters.value = res;
    loadData();
  });
}

// ----- Computed and Embedded

// ----- Watchers

// ----- Execution

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
@import "./../css/finance.scss";

.journal-table {
  thead th {
    background-color: $fin-head-bg-color;
    color: white;
    font-weight: 500;
    padding: 8px;
  }

  tbody {
    td {
      padding: 8px;
      border: 1px solid $fin-border-color;
    }

    .date-cell {
      vertical-align: top;
      font-weight: 500;
    }

    .particulars-cell {
      vertical-align: top;
    }

    .debit-cell,
    .credit-cell {
      font-family: "Courier New", Courier, monospace;
      white-space: nowrap;
    }

    .notes-row {
      .notes-cell {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.7);
      }
    }
  }
}

:deep(body.body--dark) {
  .journal-table {
    tbody {
      .notes-row {
        .notes-cell {
          color: rgba(255, 255, 255, 0.7);
        }
      }
    }
  }
}
</style>
