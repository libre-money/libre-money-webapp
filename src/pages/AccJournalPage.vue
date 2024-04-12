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
      <div class="fin-presentation-container q-pa-md journal-presentation">
        <div class="fin-presentation-head-container journal-head-container row">
          <div class="fin-presentation-head-numeric date-head">Date</div>
          <div class="fin-presentation-head-textual particulars-head">Particulars</div>
          <div class="fin-presentation-head-numeric debit-head">Debit</div>
          <div class="fin-presentation-head-numeric credit-head">Credit</div>
        </div>
        <template v-for="journalEntry in journalEntryList" v-bind:key="journalEntry.serial">
          <div class="fin-presentation-row journal-entry-row row">
            <div class="fin-presentation-item-numeric date">
              {{ prettifyDate(journalEntry.entryEpoch) }}
            </div>
            <div class="particulars-container">
              <div class="fin-presentation-row debit-row row" v-for="debit in journalEntry.debitList"
                v-bind:key="debit.account">
                <div class="fin-presentation-item-textual debit-text">
                  {{ debit.account.name }}
                  <span v-if="journalEntry.modality === 'opening'">({{ debit.account.type }})</span>
                </div>
                <div class="fin-presentation-item-numeric debit-sum">{{ debit.amount }}&nbsp;{{ debit._currencySign }}
                </div>
                <div class="fin-presentation-item-numeric column-spacer"></div>
              </div>
              <div class="fin-presentation-row credit-row row" v-for="credit in journalEntry.creditList"
                v-bind:key="credit.account">
                <div class="fin-presentation-item-textual credit-text">
                  {{ credit.account.name }}
                  <span v-if="journalEntry.modality === 'opening'">({{ credit.account.type }})</span>
                </div>
                <div class="fin-presentation-item-numeric column-spacer"></div>
                <div class="fin-presentation-item-numeric credit-sum">{{ credit.amount }}&nbsp;{{ credit._currencySign
                  }}</div>
              </div>
              <div class="notes-row row">
                <div class="fin-presentation-item-textual notes-text">
                  <div>{{ journalEntry.description }}</div>
                  <div v-if="journalEntry.notes">{{ journalEntry.notes }}</div>
                  <div v-if="!journalEntry.isBalanced && !journalEntry.isMultiCurrency" class="fin-warning">
                    Journal entry is NOT balanced.
                  </div>
                  <div v-if="!journalEntry.isBalanced && journalEntry.isMultiCurrency" class="fin-multi-currency-note">
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
    console.debug({ fullJournalEntryList });
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
@import "./../css/finance.scss";

.particulars-container {
  flex: 1;
}

.notes-row {
  font-size: 12px;
}

.journal-head-container {
  margin-bottom: 12px;
}

.journal-entry-row {
  margin-bottom: 12px;
}
</style>
