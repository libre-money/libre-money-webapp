<template>
  <q-page class="column items-center justify-start">
    <!-- Filter - Start -->
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <q-btn color="secondary" icon="filter_list" flat round @click="setFiltersClicked" />
        <div class="title">
          Journal
          <div class="subtitle" v-if="filters">
            <span v-if="filters.startEpoch === 0">
              <span v-if="journalEntryList.length > 0">
                {{ prettifyDate(journalEntryList[0].entryEpoch) }} to {{ prettifyDate(filters.endEpoch) }}
              </span>
              <span v-else>
                Up to {{ prettifyDate(filters.endEpoch) }}
              </span>
            </span>
            <span v-else>
              {{ prettifyDate(filters.startEpoch) }} to {{ prettifyDate(filters.endEpoch) }}
            </span>
          </div>
        </div>
      </div>

    </q-card>
    <!-- Filter - End -->

    <!-- Journal - Start -->
    <q-card class="std-card" v-if="!isLoading && journalEntryList.length > 0">
      <div class="q-pa-md journal-presentation">
        <div class="journal-head row">
          <div class="date-head">Date</div>
          <div class="particulars-container-head row">
            <div class="particulars-head">Particulars</div>
            <div class="debit-head">Debit</div>
            <div class="credit-head">Credit</div>
          </div>
        </div>
        <template v-for="journalEntry in journalEntryList" v-bind:key="journalEntry.serial">
          <div class="journal-entry row">
            <div class="date">
              {{ prettifyDate(journalEntry.entryEpoch) }}
            </div>
            <div class="particulars-container">
              <div class="debit-row row" v-for="debit in journalEntry.debitList" v-bind:key="debit.account">
                <div class="debit-text">
                  {{ debit.account.name }}
                  <span v-if="journalEntry.modality === 'opening'">({{ debit.account.type }})</span>
                </div>
                <div class="debit-sum">{{ debit.amount }}&nbsp;{{ debit._currencySign }}</div>
                <div class="column-spacer"></div>
              </div>
              <div class="credit-row row" v-for="credit in journalEntry.creditList" v-bind:key="credit.account">
                <div class="credit-text">
                  {{ credit.account.name }}
                  <span v-if="journalEntry.modality === 'opening'">({{ credit.account.type }})</span>
                </div>
                <div class="column-spacer"></div>
                <div class="credit-sum">{{ credit.amount }}&nbsp;{{ credit._currencySign }}</div>
              </div>
              <div class="notes-row row">
                <div class="notes-text">
                  <div>{{ journalEntry.description }}</div>
                  <div v-if="journalEntry.notes">{{ journalEntry.notes }}</div>
                  <div v-if="!journalEntry.isBalanced && !journalEntry.isMultiCurrency" class="warning">
                    Journal entry is NOT balanced.
                  </div>
                  <div v-if="!journalEntry.isBalanced && journalEntry.isMultiCurrency" class="multi-currency-note">
                    Journal is multi-currency and thereby is not balanced.
                  </div>
                </div>
                <div class="column-spacer"></div>
                <div class="column-spacer"></div>
              </div>

            </div>
          </div>
        </template>
      </div>
    </q-card>
    <!-- Journal - End -->

  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { AccJournalEntry } from "src/models/accounting/acc-journal-entry";
import { Record } from "src/models/record";
import { accountingService } from "src/services/accounting-service";
import { Ref, ref, watch } from "vue";
import { deepClone, prettifyDate, prettifyDateTime, sleep } from "src/utils/misc-utils";
import { Collection, dateRangePresetList, defaultPartyType, partyTypeList } from "src/constants/constants";
import DateInput from "src/components/lib/DateInput.vue";
import { getStartAndEndEpochFromPreset } from "src/utils/date-range-preset-utils";
import { AccJournalFilters } from "src/models/accounting/acc-journal-filters";
import FilterAccJournalDialog from "src/components/FilterAccJournalDialog.vue";

const getDefaultFilters = () => {
  return {
    startEpoch: 0,
    endEpoch: Date.now()
  };
};

const $q = useQuasar();

// ----- Refs
const isLoading = ref(false);

let fullJournalEntryList: AccJournalEntry[] = ([]);
let filteredJournalEntryList: AccJournalEntry[] = ([]);
const journalEntryList: Ref<AccJournalEntry[]> = ref([]);

const filters: Ref<AccJournalFilters> = ref(getDefaultFilters());

// ----- Functions
async function loadData() {
  isLoading.value = true;

  if (fullJournalEntryList.length === 0) {
    const {
      accountMap,
      accountList,
      journalEntryList,
    } = await accountingService.initiateAccounting();

    fullJournalEntryList = journalEntryList;
    console.log({ fullJournalEntryList });
  }

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

loadData();
</script>

<style scoped lang="scss">
.subtitle {
  font-size: 12px;
}

.journal-presentation {
  width: 100%;

  .journal-head {
    width: 100%;
    align-items: stretch;
    background-color: #37474f;
    color: white;
    margin-bottom: 12px;
    flex-wrap: nowrap;

    .date-head {
      width: 100px;
      padding: 4px;
      border: 1px solid rgb(220, 220, 220);
      border-collapse: collapse;
    }

    .particulars-container-head {
      flex: 1;
      flex-wrap: nowrap;

      .particulars-head {
        flex: 1;
        flex-wrap: nowrap;
        padding: 4px;
        border: 1px solid rgb(220, 220, 220);
        border-collapse: collapse;
      }

      .debit-head {
        width: 100px;
        padding: 4px;
        border: 1px solid rgb(220, 220, 220);
        border-collapse: collapse;
      }

      .credit-head {
        width: 100px;
        padding: 4px;
        border: 1px solid rgb(220, 220, 220);
        border-collapse: collapse;
      }
    }
  }

  .journal-entry {
    width: 100%;
    align-items: stretch;
    margin-bottom: 12px;
    flex-wrap: nowrap;

    .date {
      width: 100px;
      border: 1px solid rgb(220, 220, 220);
      border-collapse: collapse;
      padding: 4px;
    }

    .particulars-container {
      flex: 1;

      .debit-row,
      .credit-row,
      .notes-row {
        flex: 1;
        flex-wrap: nowrap;
      }

      .debit-text,
      .credit-text,
      .notes-text {
        flex: 1;
        border: 1px solid rgb(220, 220, 220);
        border-collapse: collapse;
        padding: 4px;
      }

      .notes-text {
        font-size: 12px;
      }

      .debit-sum,
      .credit-sum,
      .column-spacer {
        width: 100px;
        text-align: right;
        border: 1px solid rgb(220, 220, 220);
        border-collapse: collapse;
        padding: 4px;
      }

      .warning {
        color: #f4511e;
      }

      .multi-currency-note {
        color: #1976d2;
      }
    }
  }
}
</style>
