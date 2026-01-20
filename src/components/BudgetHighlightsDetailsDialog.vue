<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin" style="max-width: 500px">
      <q-card-section v-if="rollingBudget">
        <div class="std-dialog-title q-pa-md">{{ rollingBudget.name }} - Budget Details</div>

        <div class="dialog-card q-pa-md">
          <!-- Budget Period Info -->
          <div class="budget-period-section q-mb-md">
            <div class="text-h6 q-mb-sm">Current Period</div>
            <div class="period-info">
              <div>
                <span class="key">Period:</span>
                <span class="value"> {{ prettifyDate(currentPeriod.startEpoch) }} to {{ prettifyDate(currentPeriod.endEpoch) }} </span>
              </div>
              <div>
                <span class="key">Allocated Amount:</span>
                <span class="value">{{ printAmount(currentPeriod.allocatedAmount, rollingBudget.currencyId) }}</span>
              </div>
              <div v-if="currentPeriod.rolledOverAmount > 0">
                <span class="key">Rolled Over:</span>
                <span class="value">{{ printAmount(currentPeriod.rolledOverAmount, rollingBudget.currencyId) }}</span>
              </div>
              <div>
                <span class="key">Total Allocated:</span>
                <span class="value">{{ printAmount(currentPeriod.totalAllocatedAmount, rollingBudget.currencyId) }}</span>
              </div>
            </div>
          </div>

          <!-- Usage Info -->
          <div class="usage-section q-mb-md">
            <div class="text-h6 q-mb-sm">Usage</div>
            <div class="usage-info">
              <div>
                <span class="key">Used Amount:</span>
                <span class="value">{{ printAmount(currentPeriod.usedAmount, rollingBudget.currencyId) }}</span>
              </div>
              <div>
                <span class="key">Reserved Amount:</span>
                <span class="value">{{ printAmount(currentPeriod.heldAmount, rollingBudget.currencyId) }}</span>
              </div>
              <div>
                <span class="key">Total Used + Reserved:</span>
                <span class="value">{{ printAmount(currentPeriod.usedAmount + currentPeriod.heldAmount, rollingBudget.currencyId) }}</span>
              </div>
              <div>
                <span class="key">{{ currentPeriod.remainingAmount >= 0 ? "Remaining" : "Over Budget" }}:</span>
                <span class="value" :class="{ 'text-negative': currentPeriod.remainingAmount < 0, 'text-positive': currentPeriod.remainingAmount >= 0 }">
                  {{ printAmount(Math.abs(currentPeriod.remainingAmount), rollingBudget.currencyId) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Budget Progress Bar -->
          <div class="progress-section q-mb-md">
            <div class="text-h6 q-mb-sm">Progress</div>
            <div class="row no-wrap" style="height: 20px; border-radius: 4px; overflow: hidden; border: 1px solid #e0e0e0">
              <div
                :style="{
                  width: Math.min(100, (currentPeriod.usedAmount / currentPeriod.totalAllocatedAmount) * 100) + '%',
                  backgroundColor:
                    currentPeriod.usedAmount + currentPeriod.heldAmount > currentPeriod.totalAllocatedAmount ? 'var(--q-negative)' : 'var(--q-positive)',
                  height: '100%',
                }"
              ></div>
              <div
                :style="{
                  width:
                    Math.min(
                      100 - Math.min(100, (currentPeriod.usedAmount / currentPeriod.totalAllocatedAmount) * 100),
                      (currentPeriod.heldAmount / currentPeriod.totalAllocatedAmount) * 100
                    ) + '%',
                  backgroundColor: 'var(--q-warning)',
                  height: '100%',
                }"
              ></div>
              <div
                :style="{
                  flex: 1,
                  backgroundColor: '#e0e0e0',
                  height: '100%',
                }"
              ></div>
            </div>
            <div class="text-caption text-center q-mt-xs">
              {{ Math.round(((currentPeriod.usedAmount + currentPeriod.heldAmount) / currentPeriod.totalAllocatedAmount) * 100) }}% used
            </div>
          </div>

          <!-- Budget Settings -->
          <div class="settings-section">
            <div class="text-h6 q-mb-sm">Budget Settings</div>
            <div class="settings-info">
              <div>
                <span class="key">Includes Expenses:</span>
                <span class="value">{{ rollingBudget.includeExpenses ? "Yes" : "No" }}</span>
              </div>
              <div>
                <span class="key">Includes Asset Purchases:</span>
                <span class="value">{{ rollingBudget.includeAssetPurchases ? "Yes" : "No" }}</span>
              </div>
              <div>
                <span class="key">Roll Over Rule:</span>
                <span class="value">{{ formatRollOverRule(rollingBudget.rollOverRule) }}</span>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="primary" label="View Records" @click="viewRecordsClicked" />
        <q-btn color="secondary" label="Edit Budget" @click="editBudgetClicked" />
        <div style="flex: 1"></div>
        <q-btn color="blue-grey" label="Close" @click="closeClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { useDialogPluginComponent, useQuasar } from "quasar";
import AddRollingBudget from "src/components/AddRollingBudget.vue";
import { RollingBudget } from "src/schemas/rolling-budget";
import { rollingBudgetService } from "src/services/rolling-budget-service";
import { useRecordFiltersStore } from "src/stores/record-filters-store";
import { printAmount } from "src/utils/de-facto-utils";
import { prettifyDate } from "src/utils/misc-utils";
import { computed, PropType } from "vue";
import { useRouter } from "vue-router";

const props = defineProps({
  rollingBudget: {
    type: Object as PropType<RollingBudget>,
    required: true,
  },
});

// Quasar and router
const $q = useQuasar();
const router = useRouter();
const recordFiltersStore = useRecordFiltersStore();

// Dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

// Emits
defineEmits([...useDialogPluginComponent.emits]);

// Computed properties
const currentPeriod = computed(() => {
  return props.rollingBudget.budgetedPeriodList[props.rollingBudget._budgetedPeriodIndexInRange!];
});

// Functions
function formatRollOverRule(rule: string): string {
  switch (rule) {
    case "always":
      return "Always";
    case "never":
      return "Never";
    case "positive-only":
      return "Positive amounts only";
    case "negative-only":
      return "Negative amounts only";
    default:
      return rule;
  }
}

function closeClicked() {
  onDialogOK();
}

function editBudgetClicked() {
  onDialogOK();
  $q.dialog({
    component: AddRollingBudget,
    componentProps: { existingBudgetId: props.rollingBudget._id },
  });
}

function viewRecordsClicked() {
  recordFiltersStore.setRecordFilters(rollingBudgetService.createRecordFiltersForRollingBudget(props.rollingBudget));
  onDialogOK({ reloadRecords: true });
}
</script>

<style scoped lang="scss">
.dialog-card {
  .key {
    font-weight: 600;
    color: #666;
    display: inline-block;
    min-width: 140px;
  }

  .value {
    font-weight: 500;
  }

  .period-info,
  .usage-info,
  .settings-info {
    > div {
      margin-bottom: 8px;
      display: flex;
      align-items: center;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .text-positive {
    color: var(--q-positive);
  }

  .text-negative {
    color: var(--q-negative);
  }
}

.std-bottom-action-row {
  padding: 16px;
}
</style>
