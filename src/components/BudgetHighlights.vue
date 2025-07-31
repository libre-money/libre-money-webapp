<template>
  <!-- Featured Rolling Budgets -->
  <q-card class="std-card featured-rolling-budgets-card" style="margin-bottom: 4px" v-show="featuredRollingBudgetList.length > 0">
    <div class="featured-rolling-budget-list q-pa-md q-gutter-sm">
      <q-btn
        v-if="featuredRollingBudgetList.length > 1"
        style="position: absolute; left: -4px; top: 52px"
        color="secondary"
        :icon="showAllRollingBudgets ? 'expand_less' : 'expand_more'"
        flat
        round
        @click="toggleShowAllRollingBudgets"
      />
      <template v-for="rollingBudget in featuredRollingBudgetList" :key="rollingBudget._id">
        <div class="featured-rolling-budget" v-if="rollingBudget.isFeatured || showAllRollingBudgets">
          <div class="featured-rolling-budget-name" style="margin-bottom: 8px">
            {{ rollingBudget.name }} ({{ prettifyDate(rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].startEpoch) }} to
            {{ prettifyDate(rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].endEpoch) }})
          </div>
          <div>
            <div class="row no-wrap" style="height: 10px; border-radius: 5px; overflow: hidden">
              <div
                :style="{
                  width: (rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].usedAmount / rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].totalAllocatedAmount * 100) + '%',
                  backgroundColor: rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].usedAmount + rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].heldAmount > rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].totalAllocatedAmount ? 'var(--q-negative)' : 'var(--q-positive)',
                  height: '100%',
                }"
              ></div>
              <div
                v-if="rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].usedAmount < rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].totalAllocatedAmount"
                :style="{
                  width: (rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].heldAmount / rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].totalAllocatedAmount * 100) + '%',
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
            <div class="text-caption text-right">
              Used
              {{
                printAmount(
                  asAmount(rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].usedAmount) +
                    asAmount(rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].heldAmount),
                  rollingBudget.currencyId
                )
              }}
              out of
              {{ printAmount(rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].totalAllocatedAmount, rollingBudget.currencyId) }}
              <br />{{ rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].remainingAmount >= 0 ? "Remaining: " : "Over budget by: "
              }}{{
                printAmount(Math.abs(rollingBudget.budgetedPeriodList[rollingBudget._budgetedPeriodIndexInRange!].remainingAmount), rollingBudget.currencyId)
              }}
              <q-icon
                name="info"
                size="12px"
                class="budget-details-icon q-ml-xs"
                @click="showBudgetDetails(rollingBudget)"
                style="cursor: pointer; color: #666"
                title="View budget details"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </q-card>
  <!-- End of Featured Rolling Budgets -->
</template>

<script lang="ts" setup>
import { debounce, useQuasar } from "quasar";
import { RollingBudget } from "src/models/rolling-budget";
import { RecordFilters } from "src/models/inferred/record-filters";
import BudgetHighlightsDetailsDialog from "src/components/BudgetHighlightsDetailsDialog.vue";
import { rollingBudgetService } from "src/services/rolling-budget-service";
import { normalizeEpochRange } from "src/utils/date-utils";
import { deepClone, prettifyDate } from "src/utils/misc-utils";
import { printAmount } from "src/utils/de-facto-utils";
import { Ref, ref } from "vue";
import { asAmount } from "src/utils/de-facto-utils";

// Props
interface Props {
  recordFilters?: RecordFilters | null;
  filterMonth?: number;
  filterYear?: number;
}

const props = withDefaults(defineProps<Props>(), {
  recordFilters: null,
  filterMonth: () => new Date().getMonth(),
  filterYear: () => new Date().getFullYear(),
});

// Emits
const emit = defineEmits(["reloadRecords"]);

// Quasar
const $q = useQuasar();

// Reactive data
const featuredRollingBudgetList: Ref<RollingBudget[]> = ref([]);
const showAllRollingBudgets = ref(false);

// Functions
function hideRollingBudgets() {
  featuredRollingBudgetList.value = [];
}

async function loadFeaturedRollingBudgets() {
  let startEpoch,
    endEpoch = 0;
  if (props.recordFilters) {
    [startEpoch, endEpoch] = normalizeEpochRange(props.recordFilters.startEpoch, props.recordFilters.endEpoch);
  } else {
    let rangeStart = new Date(props.filterYear, props.filterMonth, 1);
    let rangeEnd = new Date(props.filterYear, props.filterMonth, 1);
    rangeEnd.setMonth(rangeEnd.getMonth() + 1);
    rangeEnd.setDate(rangeEnd.getDate() - 1);
    [startEpoch, endEpoch] = normalizeEpochRange(rangeStart.getTime(), rangeEnd.getTime());
  }
  featuredRollingBudgetList.value = await rollingBudgetService.listAllBudgetsInRange(startEpoch, endEpoch);
  console.debug({ featuredRollingBudgetList: deepClone(featuredRollingBudgetList.value) });
}

const loadFeaturedRollingBudgetsDebounced = debounce(loadFeaturedRollingBudgets, 100, true);

function toggleShowAllRollingBudgets() {
  showAllRollingBudgets.value = !showAllRollingBudgets.value;
}

function showBudgetDetails(rollingBudget: RollingBudget) {
  $q.dialog({
    component: BudgetHighlightsDetailsDialog,
    componentProps: {
      rollingBudget: rollingBudget,
    },
  }).onOk((data) => {
    if (data.reloadRecords) {
      emit("reloadRecords");
    }
  });
}

// Expose functions for parent component
defineExpose({
  hideRollingBudgets,
  loadFeaturedRollingBudgets: loadFeaturedRollingBudgetsDebounced,
});
</script>
