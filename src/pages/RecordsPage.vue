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
        <div v-for="(record, index) in rows" class="data-row" v-bind:key="record._id">
          <!-- Expense - start -->
          <div class="expense-row" v-if="record.type === RecordType.EXPENSE" :data-index="index">
            <div class="row items-center primary-row">
              <div class="expense-avenue">
                {{ record.expense?.expenseAvenue.name }}
              </div>
              <div class="spacer"></div>
              <div class="amount">
                {{ dataInferenceService.prettifyAmount(record.expense?.amount!, record.expense?.currencyId!) }}
              </div>
            </div>

            <div class="row payment-row">
              <div class="party" v-if="record.expense?.partyId">Party: {{ record.expense.party.name }}</div>

              <div class="unpaid-amount" v-if="record.expense?.amountUnpaid! > 0">
                Unpaid:
                {{ dataInferenceService.prettifyAmount(record.expense?.amountUnpaid!, record.expense?.currencyId!) }}
              </div>
            </div>

            <div class="row tags-row">
              <div class="record-type" :data-record-type="record.type">
                {{ record.type }}
              </div>
              <div class="tag" v-for="tag in record.tagList" v-bind:key="tag._id">
                {{ tag.name }}
              </div>
            </div>

            <div class="notes" v-if="record.notes">{{ record.notes }}</div>
          </div>
          <!-- Expense - end -->

          <div class="misc-row" v-else :data-index="index">{{ record.type }} {{ record.expense?.amount }} {{ record.notes }}</div>
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, watch } from "vue";
import { useQuasar } from "quasar";
import { pouchdbService } from "src/services/pouchdb-service";
import { Record } from "src/models/record";
import { dialogService } from "src/services/dialog-service";
import AddExpenseRecord from "src/components/AddExpenseRecord.vue";
import { Collection, RecordType } from "src/constants/constants";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { dataInferenceService } from "src/services/data-inference-service";

export default defineComponent({
  name: "RecordsPage",
  components: {},
  setup() {
    const $q = useQuasar();

    // -----

    const searchFilter: Ref<string | null> = ref(null);

    const isLoading = ref(false);

    let rows: Ref<InferredRecord[]> = ref([]);

    // -----

    async function addExpenseClicked() {
      $q.dialog({ component: AddExpenseRecord }).onOk((res) => {
        loadData();
      });
    }

    async function loadData() {
      await dataInferenceService.updateCurrencyCache();

      console.log("TODO");

      let rawDataRows = (await pouchdbService.listByCollection(Collection.RECORD)).docs as Record[];

      let dataRows = await Promise.all(rawDataRows.map((rawData) => dataInferenceService.inferRecord(rawData)));

      rows.value = dataRows;
    }

    async function editClicked(record: InferredRecord) {
      console.log("TODO");

      // $q.dialog({ component: AddRecord, componentProps: { existingRecordId: record._id } }).onOk((res) => {
      //   loadData();
      // });
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

    // -----

    loadData();

    // -----

    watch(searchFilter, (_, __) => {
      loadData();
    });

    return {
      addExpenseClicked,
      searchFilter,
      rows,
      isLoading,
      editClicked,
      deleteClicked,
      RecordType,
      dataInferenceService,
    };
  },
});
</script>

<style scoped lang="scss">
.sub-heading {
  font-size: 20px;
  margin-bottom: 12px;
}

.record-type {
  font-size: 12px;
  padding: 2px 6px;
  display: inline-block;
  border-radius: 10px;

  &[data-record-type="expense"] {
    background-color: $record-expense-primary-color;
    color: $record-expense-text-color;
  }
}

.tag {
  font-size: 12px;
  padding: 2px 6px;
  display: inline-block;
  border-radius: 10px;
  background-color: #666666;
  color: rgb(245, 245, 245);
  margin-left: 4px;
}

.amount {
  font-size: 24px;
  display: inline-block;
}

.expense-avenue {
  font-size: 16px;
}

.party {
  margin-right: 8px;
}
</style>
