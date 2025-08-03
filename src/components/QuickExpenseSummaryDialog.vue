<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section v-if="summaryList.length">
        <div class="std-dialog-title" style="margin-bottom: 12px">Summary</div>
        <loading-indicator :is-loading="isLoading" :phases="4" ref="loadingIndicator"></loading-indicator>
        <div class="quick-summary-container" v-if="!isLoading">
          <div v-for="summary in summaryList" v-bind:key="summary.currency._id!" style="padding-bottom: 12px">
            <table class="overview-table quick-summary-table">
              <tbody>
                <tr>
                  <th colspan="2">{{ summary.currency.name }}</th>
                </tr>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
                <tr v-for="summaryItem in summary.summary" v-bind:key="summaryItem.type">
                  <td>
                    {{ summaryItem.description }}
                    <span v-if="summaryItem.type === 'Purchase'"> (Asset)</span>
                  </td>
                  <td>{{ printCount(summaryItem.amount) }}</td>
                </tr>
                <tr>
                  <th>Total</th>
                  <th>{{ printCount(summary.sum) }}</th>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end" style="margin-right: 8px; margin-bottom: 8px">
        <q-btn color="primary" label="Close" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { Currency } from "src/models/currency";
import { QuickExpenseSummary } from "src/models/inferred/quick-expense-summary";
import { Record } from "src/models/record";
import { computationService } from "src/services/computation-service";
import { printCount } from "src/utils/de-facto-utils";
import { Ref, onMounted, ref } from "vue";

// defineProps and defineEmits for script setup
const props = defineProps<{
  recordList: unknown[];
}>();

const emit = defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const $q = useQuasar();

const isLoading = ref(true);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const summaryList: Ref<{ currency: Currency; sum: number; summary: QuickExpenseSummary[] }[]> = ref([]);

async function loadOverview() {
  isLoading.value = true;

  let newOverview = await computationService.computeQuickExpenseSummary(props.recordList as unknown as Record[]);
  summaryList.value = newOverview;

  isLoading.value = false;
}

async function okClicked() {
  onDialogOK();
}

onMounted(() => {
  loadOverview();
});
</script>
<style scoped lang="scss">
@import url(./../css/table.scss);

.wallet-limit-normal {
  color: #546e7a;
}

.wallet-limit-warning {
  color: #546e7a;
  border-bottom: 4px solid #ffd740;
}

.wallet-limit-exceeded {
  color: #bf360c;
}

@media (max-width: $breakpoint-xs-max) {
  .wallet-limit {
    display: block;
  }
}
</style>
