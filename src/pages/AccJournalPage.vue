<template>
  <q-page class="row items-start justify-evenly">

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
            <div class="date">{{ prettifyDate(journalEntry.entryEpoch) }}</div>
            <div class="particulars-container">
              <div class="debit-row row" v-for="debit in journalEntry.debitList" v-bind:key="debit.account">
                <div class="debit-text">{{ debit.account.name }}</div>
                <div class="debit-sum">{{ debit.amount }}&nbsp;{{ debit._currencySign }}</div>
                <div class="column-spacer"></div>
              </div>
              <div class="credit-row row" v-for="credit in journalEntry.creditList" v-bind:key="credit.account">
                <div class="credit-text">{{ credit.account.name }}</div>
                <div class="column-spacer"></div>
                <div class="credit-sum">{{ credit.amount }}&nbsp;{{ credit._currencySign }}</div>
              </div>
              <div class="notes-row row">
                <div class="notes-text">
                  <div>{{ journalEntry.description }}</div>
                  <div v-if="journalEntry.notes">{{ journalEntry.notes }}</div>
                  <div v-if="!journalEntry.isBalanced && !journalEntry.isMultiCurrency" class="warning">
                    Journal is NOT balanced.
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
import { Ref, ref } from "vue";
import { prettifyDate, prettifyDateTime, sleep } from "src/utils/misc-utils";

const $q = useQuasar();

// ----- Refs
const isLoading = ref(false);
const journalEntryList: Ref<AccJournalEntry[]> = ref([]);


// ----- Functions
async function loadData() {
  isLoading.value = true;

  const {
    accountMap,
    accountList,
    journalEntryList: _journalEntryList,
  } = await accountingService.initiateAccounting();

  console.log({ _journalEntryList });

  journalEntryList.value = _journalEntryList;

  isLoading.value = false;
}

// ----- Event Handlers


// ----- Computed and Embedded

// ----- Watchers


// ----- Execution

loadData();
</script>

<style scoped lang="scss">
.journal-presentation {
  width: 100%;

  .journal-head {
    width: 100%;
    align-items: stretch;
    background-color: #37474f;
    color: white;
    margin-bottom: 12px;

    .date-head {
      width: 100px;
      padding: 4px;
      border: 1px solid rgb(220, 220, 220);
      border-collapse: collapse;
    }

    .particulars-container-head {
      flex: 1;

      .particulars-head {
        flex: 1;
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
    }
  }
}
</style>
