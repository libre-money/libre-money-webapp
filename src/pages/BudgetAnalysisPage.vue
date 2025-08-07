<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Budget Analysis</div>
      </div>

      <div class="q-pa-md">
        <!-- Budget Selection -->
        <div class="q-mb-md">
          <q-select
            v-model="selectedBudget"
            :options="budgetOptions"
            option-label="name"
            option-value="_id"
            label="Select Budget"
            outlined
            dense
            @update:model-value="onBudgetSelected"
          />
        </div>

        <!-- Loading Indicator -->
        <loading-indicator :is-loading="isLoading" :phases="3" ref="loadingIndicator" />

        <!-- Analysis Table -->
        <div v-if="!isLoading && analysisResult" class="budget-analysis-container">
          <div class="q-mb-md">
            <h6>{{ analysisResult.budget.name }} - {{ analysisResult.currency.name }}</h6>
            <p class="text-caption">Comparative breakdown across {{ analysisResult.periods.length }} periods</p>
          </div>

          <div class="table-container">
            <table class="budget-analysis-table">
              <thead>
                <tr>
                  <th class="item-header">Item</th>
                  <th class="type-header">Type</th>
                  <th v-for="period in analysisResult.periods" :key="`${period.startEpoch}-${period.endEpoch}`" class="period-header">
                    {{ formatPeriodTitle(period) }}
                  </th>
                  <th class="total-header">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in analysisResult.items" :key="item.id" class="item-row">
                  <td class="item-name">
                    {{ item.name }}
                    <q-chip v-if="item.type === 'Asset'" size="sm" color="blue" text-color="white" label="Asset" />
                  </td>
                  <td class="item-type">{{ item.type }}</td>
                  <td v-for="periodData in item.periods" :key="`${periodData.period.startEpoch}-${periodData.period.endEpoch}`" class="period-amount">
                    <div v-if="periodData.amount > 0" class="amount-cell">
                      <div class="amount">{{ printAmount(periodData.amount, item.currency._id) }}</div>
                      <div class="count">({{ periodData.count }} {{ periodData.count === 1 ? "record" : "records" }})</div>
                    </div>
                    <div v-else class="amount-cell empty">-</div>
                  </td>
                  <td class="total-amount">
                    <div class="amount">{{ printAmount(item.totalAmount, item.currency._id) }}</div>
                    <div class="count">({{ item.totalCount }} {{ item.totalCount === 1 ? "record" : "records" }})</div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="summary-row">
                  <td class="summary-label">
                    <strong>Total</strong>
                  </td>
                  <td class="summary-type"></td>
                  <td
                    v-for="periodTotal in analysisResult.periodTotals"
                    :key="`total-${periodTotal.period.startEpoch}-${periodTotal.period.endEpoch}`"
                    class="period-total"
                  >
                    <div v-if="periodTotal.totalAmount > 0" class="amount-cell">
                      <div class="amount">{{ printAmount(periodTotal.totalAmount, analysisResult.currency._id) }}</div>
                      <div class="count">({{ periodTotal.totalCount }} {{ periodTotal.totalCount === 1 ? "record" : "records" }})</div>
                      <div class="allocated">Allocated: {{ printAmount(periodTotal.period.allocatedAmount, analysisResult.currency._id) }}</div>
                      <div class="rolled-over">Rolled Over: {{ printAmount(periodTotal.period.rolledOverAmount, analysisResult.currency._id) }}</div>
                      <div class="effective-budget">Working Budget: {{ printAmount(periodTotal.totalAllocatedAmount, analysisResult.currency._id) }}</div>
                    </div>
                    <div v-else class="amount-cell empty">
                      <div class="allocated">Budget: {{ printAmount(periodTotal.totalAllocatedAmount, analysisResult.currency._id) }}</div>
                    </div>
                  </td>
                  <td class="total-summary">
                    <div class="amount">{{ printAmount(analysisResult.grandTotal.totalAmount, analysisResult.currency._id) }}</div>
                    <div class="count">
                      ({{ analysisResult.grandTotal.totalCount }} {{ analysisResult.grandTotal.totalCount === 1 ? "record" : "records" }})
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Summary -->
          <div class="q-mt-lg summary-section">
            <q-card flat bordered>
              <q-card-section>
                <h6>Summary</h6>
                <div class="row q-gutter-md">
                  <div class="col-12 col-sm-6">
                    <div class="summary-item">
                      <span class="label">Total Items:</span>
                      <span class="value">{{ analysisResult.items.length }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="label">Total Amount:</span>
                      <span class="value">{{ printAmount(analysisResult.grandTotal.totalAmount, analysisResult.currency._id) }}</span>
                    </div>
                  </div>
                  <div class="col-12 col-sm-6">
                    <div class="summary-item">
                      <span class="label">Periods:</span>
                      <span class="value">{{ analysisResult.periods.length }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="label">Currency:</span>
                      <span class="value">{{ analysisResult.currency.name }}</span>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- No Data Message -->
        <div v-if="!isLoading && !analysisResult" class="text-center q-pa-lg">
          <q-icon name="analytics" size="64px" color="grey-5" />
          <p class="text-grey-6 q-mt-md">Select a budget to view analysis</p>
        </div>

        <!-- No Budgets Message -->
        <div v-if="!isLoading && budgetOptions.length === 0" class="text-center q-pa-lg">
          <q-icon name="warning" size="64px" color="orange" />
          <p class="text-grey-6 q-mt-md">No budgets available for analysis</p>
          <q-btn color="primary" label="Create Budget" @click="createBudgetClicked" />
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { RollingBudget } from "src/models/rolling-budget";
import { BudgetAnalysisResult, budgetAnalysisService } from "src/services/budget-analysis-service";
import { printAmount } from "src/utils/de-facto-utils";
import { prettifyDate } from "src/utils/misc-utils";
import { onMounted, ref, type Ref } from "vue";
import { useRouter } from "vue-router";

const $q = useQuasar();
const router = useRouter();

const isLoading = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();
const selectedBudget: Ref<RollingBudget | null> = ref(null);
const budgetOptions: Ref<RollingBudget[]> = ref([]);
const analysisResult: Ref<BudgetAnalysisResult | null> = ref(null);

async function loadBudgets() {
  try {
    budgetOptions.value = await budgetAnalysisService.getBudgetsWithAnalysis();
  } catch (error) {
    console.error("Error loading budgets:", error);
    $q.notify({
      type: "negative",
      message: "Failed to load budgets",
    });
  }
}

async function onBudgetSelected(budget: RollingBudget | null) {
  if (!budget) {
    analysisResult.value = null;
    return;
  }

  isLoading.value = true;
  try {
    analysisResult.value = await budgetAnalysisService.computeBudgetAnalysis(budget);
  } catch (error) {
    console.error("Error computing budget analysis:", error);
    $q.notify({
      type: "negative",
      message: "Failed to compute budget analysis",
    });
    analysisResult.value = null;
  } finally {
    isLoading.value = false;
  }
}

function formatPeriodTitle(period: any): string {
  const startDate = prettifyDate(period.startEpoch);
  const endDate = prettifyDate(period.endEpoch);
  return `${startDate} - ${endDate}`;
}

function createBudgetClicked() {
  router.push("/rolling-budgets");
}

onMounted(() => {
  loadBudgets();
});
</script>

<style scoped lang="scss">
.budget-analysis-container {
  .table-container {
    overflow-x: auto;
    max-width: 100%;
  }

  .budget-analysis-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;

    th,
    td {
      padding: 8px 12px;
      text-align: left;
      border: 1px solid #e0e0e0;
    }

    th {
      background-color: #f5f5f5;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .item-header {
      min-width: 200px;
    }

    .type-header {
      min-width: 100px;
    }

    .period-header {
      min-width: 150px;
      text-align: center;
    }

    .total-header {
      min-width: 150px;
      text-align: center;
      background-color: #e3f2fd;
    }

    .item-name {
      font-weight: 500;
    }

    .item-type {
      color: #666;
    }

    .period-amount {
      text-align: center;
    }

    .total-amount {
      text-align: center;
      background-color: #f8f9fa;
      font-weight: 500;
    }

    .amount-cell {
      .amount {
        font-weight: 500;
        color: #1976d2;
      }

      .count {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
      }

      .allocated {
        font-size: 11px;
        color: #888;
        margin-top: 2px;
        font-style: italic;
      }

      &.empty {
        color: #ccc;
      }
    }

    .item-row:hover {
      background-color: #f8f9fa;
    }

    .summary-row {
      background-color: #e3f2fd;
      font-weight: 600;

      .summary-label {
        font-weight: 700;
        color: #1976d2;
      }

      .summary-type {
        background-color: #e3f2fd;
      }

      .period-total {
        text-align: center;
        background-color: #e3f2fd;

        .amount {
          font-weight: 700;
          color: #1976d2;
        }

        .count {
          font-weight: 500;
          color: #1976d2;
        }

        .rolled-over {
          font-size: 11px;
          color: #888;
          margin-top: 2px;
          font-style: italic;
          font-weight: 500;
        }

        .effective-budget {
          font-size: 11px;
          color: #1976d2;
          margin-top: 2px;
          font-style: italic;
          font-weight: 500;
        }

        .allocated {
          font-size: 11px;
          color: #888;
          margin-top: 2px;
          font-style: italic;
          font-weight: 500;
        }
      }

      .total-summary {
        text-align: center;
        background-color: #bbdefb;
        font-weight: 700;

        .amount {
          color: #1565c0;
        }

        .count {
          color: #1565c0;
        }
      }
    }
  }

  .summary-section {
    .summary-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;

      .label {
        font-weight: 500;
        color: #666;
      }

      .value {
        font-weight: 600;
        color: #1976d2;
      }
    }
  }
}

@media (max-width: 768px) {
  .budget-analysis-table {
    font-size: 12px;

    th,
    td {
      padding: 4px 6px;
    }

    .period-header,
    .total-header {
      min-width: 120px;
    }
  }
}
</style>
