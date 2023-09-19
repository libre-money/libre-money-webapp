<template>
  <q-page class="row items-start justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn-dropdown size="md" color="primary" label="Add Expenses" split @click="addExpenseClicked">
          <q-list>
            <q-item clickable v-close-popup>
              <q-item-section>
                <q-item-label>Add Income</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup>
              <q-item-section>
                <q-item-label>Transfer Money</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>

      <div class="q-pa-md">
        <div class="sub-heading">Records</div>
        <div class="loading-notifier" v-if="isLoading">
          <q-spinner color="primary" size="32px"></q-spinner>
        </div>
        <template v-if="!isLoading">
          <div v-for="(record, index) in rows" class="record-row" v-bind:key="record._id">
            <!-- Expense - start -->
            <div class="expense-row row" v-if="record.type === RecordType.EXPENSE" :data-index="index">
              <div class="details-section">
                <div class="primary-line">
                  {{ record.expense?.expenseAvenue.name }}
                </div>

                <div class="row secondary-line">
                  <div class="party" v-if="record.expense?.partyId">Party: {{ record.expense.party.name }}</div>
                </div>

                <div class="notes" v-if="record.notes">{{ record.notes }}</div>

                <div class="row tags-line">
                  <div class="record-type" :data-record-type="record.type">
                    {{ record.type }}
                  </div>
                  <div class="tag" v-for="tag in record.tagList" v-bind:key="tag._id">
                    {{ tag.name }}
                  </div>
                </div>
              </div>

              <div class="amounts-section">
                <div class="amount">
                  {{ dataInferenceService.prettifyAmount(record.expense?.amount!, record.expense?.currencyId!) }}
                </div>
                <div class="unpaid-amount" v-if="record.expense?.amountUnpaid! > 0">
                  Unpaid:
                  {{ dataInferenceService.prettifyAmount(record.expense?.amountUnpaid!, record.expense?.currencyId!) }}
                </div>
              </div>
            </div>
            <!-- Expense - end -->

            <div class="misc-row" v-else :data-index="index">{{ record.type }} {{ record.expense?.amount }} {{ record.notes }}</div>
          </div>
        </template>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { Ref, ref, watch } from "vue";
import { useQuasar } from "quasar";
import { pouchdbService } from "src/services/pouchdb-service";
import { Record } from "src/models/record";
import { dialogService } from "src/services/dialog-service";
import AddExpenseRecord from "src/components/AddExpenseRecord.vue";
import { Collection, RecordType } from "src/constants/constants";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { dataInferenceService } from "src/services/data-inference-service";

const $q = useQuasar();

// ----- Refs
const searchFilter: Ref<string | null> = ref(null);
const isLoading = ref(false);
const rows: Ref<InferredRecord[]> = ref([]);

// ----- Functions

async function loadData() {
  isLoading.value = true;

  await dataInferenceService.updateCurrencyCache();

  let rawDataRows = (await pouchdbService.listByCollection(Collection.RECORD)).docs as Record[];
  let dataRows = await Promise.all(rawDataRows.map((rawData) => dataInferenceService.inferRecord(rawData)));
  rows.value = dataRows;

  isLoading.value = false;
}

// ----- Event Handlers

async function addExpenseClicked() {
  $q.dialog({ component: AddExpenseRecord }).onOk((res) => {
    loadData();
  });
}

async function editClicked(record: InferredRecord) {
  $q.dialog({ component: AddExpenseRecord, componentProps: { existingRecordId: record._id } }).onOk((res) => {
    loadData();
  });
}

async function deleteClicked(record: InferredRecord) {
  let answer = await dialogService.confirm("Remove record", "Are you sure you want to remove the record?");
  if (!answer) return;

  let res = await pouchdbService.removeDoc(record);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the record.");
  }

  loadData();
}

// ----- Watchers

watch(searchFilter, (_, __) => {
  loadData();
});

// ----- Execution

loadData();
</script>

<style scoped lang="scss">
.sub-heading {
  font-size: 20px;
  margin-bottom: 12px;
}

.record-row {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #eaeaea;

  .details-section {
    flex: 1;

    .primary-line {
      font-size: 16px;
    }

    .tags-line {
      .record-type {
        font-size: 12px;
        padding: 2px 6px;
        display: inline-block;
        border-radius: 6px;

        &[data-record-type="expense"] {
          background-color: $record-expense-primary-color;
          color: $record-expense-text-color;
        }
      }

      .tag {
        font-size: 12px;
        padding: 2px 6px;
        display: inline-block;
        border-radius: 6px;
        background-color: #666666;
        color: rgb(245, 245, 245);
        margin-left: 4px;
      }
    }
  }

  .amounts-section {
    text-align: right;

    .amount {
      font-size: 24px;
      display: inline-block;
    }
  }
}

.loading-notifier {
  width: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  justify-items: center;
  padding: 24px;
  padding-top: 0px;
}
</style>
