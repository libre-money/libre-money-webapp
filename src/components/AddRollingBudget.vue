<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-xs q-mb-sm">{{ existingBudgetId ? "Editing a Rolling Budget" : "Adding a Rolling Budget" }}</div>
        <q-form class="q-gutter-md q-pa-xs" ref="budgetForm">
          <div class="custom-group">
            <q-input filled v-model="budgetName" label="Name of the Rolling Budget" lazy-rules :rules="validators.name" />
            <select-currency v-model="budgetCurrencyId"></select-currency>
            <q-checkbox
              v-model="budgetIsFeatured"
              label="Highlight in Records Page"
              @update:model-value="optionChanged('featured')"
              style="margin-top: -16px"
            />
          </div>

          <div class="custom-group">
            <q-checkbox v-model="budgetIncludeExpenses" label="Apply to Expenses" @update:model-value="optionChanged('expenses')" />
            <q-checkbox
              v-model="budgetIncludeAssetPurchases"
              label="Apply to Asset Purchases"
              @update:model-value="optionChanged('assetPurchases')"
              style="margin-bottom: 12px"
            />
            <select-tag v-model="budgetTagIdWhiteList" label="Only include records with these tags"></select-tag>
            <select-tag v-model="budgetTagIdBlackList" label="Exclude records with these tags"></select-tag>
            <q-select
              v-model="budgetRollOverRule"
              :options="rollOverRuleList"
              label="Roll Over Rule"
              option-value="value"
              option-label="label"
              map-options
              emit-value
              filled
            />
          </div>

          <q-select
            v-model="budgetFrequency"
            :options="budgetFrequencyList"
            label="Frequency"
            option-value="value"
            option-label="label"
            map-options
            emit-value
            filled
            @update:model-value="onFrequencyChanged"
          />

          <!-- Monthly frequency controls -->
          <div v-if="budgetFrequency === 'monthly'">
            <div class="row q-gutter-sm">
              <div class="col">
                <date-input v-model="monthlyStartDate" label="Start Date" @update:model-value="onMonthlyDateChanged" />
              </div>
              <div class="col">
                <date-input v-model="monthlyEndDate" label="End Date" @update:model-value="onMonthlyDateChanged" />
              </div>
            </div>
            <div class="col-12 q-mt-md q-mb-md">
              <q-btn color="primary" label="(Re)generate Monthly Periods" @click="generateMonthlyPeriodsFromDates" />
            </div>
          </div>

          <q-btn v-if="budgetFrequency === 'irregular'" color="primary" label="Add Period" @click="addPeriod" />

          <!-- @vue-expect-error -->
          <q-table class="budgeted-period-table" :rows="budgetedPeriodList" :columns="tableColumns" flat>
            <template v-slot:body="props">
              <q-tr :props="props">
                <q-td key="startDate" :props="props">
                  <date-input v-model="props.row.startEpoch" only-icon></date-input>
                  {{ prettifyDate(props.row.startEpoch) }}
                </q-td>
                <q-td key="endDate" :props="props">
                  <date-input v-model="props.row.endEpoch" only-icon></date-input>
                  {{ prettifyDate(props.row.endEpoch) }}
                </q-td>
                <q-td key="allocated" :props="props">
                  <q-input type="number" dense v-model="props.row.allocatedAmount" @update:model-value="allocatedAmountChanged(props.row)" />
                </q-td>
                <q-td key="rolledOver" :props="props">
                  {{ printAmount(props.row.rolledOverAmount, null) }}
                </q-td>
                <q-td key="total" :props="props">
                  {{ printAmount(props.row.totalAllocatedAmount, null) }}
                </q-td>
                <q-td key="used" :props="props">
                  {{ printAmount(props.row.usedAmount, null) }}
                </q-td>
                <q-td key="held" :props="props">
                  <q-input type="number" dense v-model="props.row.heldAmount" @update:model-value="heldAmountChanged(props.row)" />
                </q-td>
                <q-td key="remaining" :props="props">
                  {{ printAmount(props.row.remainingAmount, null) }}
                </q-td>
                <q-td auto-width>
                  <q-btn size="sm" color="negative" round dense icon="delete" @click="removePeriod(props.rowIndex)" />
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="secondary" label="Sort & (re)Calculate" @click="calculatePeriods" />
        <div class="spacer"></div>
        <q-btn color="blue-grey" label="Cancel" @click="onDialogCancel" />
        <q-btn color="primary" label="OK" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { Collection, defaultRollOverRule, rollOverRuleList, budgetFrequencyList, defaultBudgetFrequency } from "src/constants/constants";
import { BudgetedPeriod, RollingBudget } from "src/models/rolling-budget";
import { dialogService } from "src/services/dialog-service";
import { entityService } from "src/services/entity-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { validators } from "src/utils/validators";
import { ref, watch, onMounted } from "vue";
import DateInput from "./lib/DateInput.vue";
import SelectCurrency from "./SelectCurrency.vue";
import SelectTag from "./SelectTag.vue";
import { prettifyDate } from "src/utils/misc-utils";
import { asAmount } from "src/utils/de-facto-utils";
import { computationService } from "src/services/computation-service";
import { normalizeEpochAsDate, generateMonthlyPeriods } from "src/utils/date-utils";
import { printAmount } from "src/utils/de-facto-utils";

// Props
const props = defineProps<{
  existingBudgetId?: string | null;
  prefill?: object | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// State
let initialDoc: RollingBudget | null = null;

const isLoading = ref(false);

const budgetForm = ref<QForm | null>(null);

const budgetName = ref<string | null>(null);
const budgetStartEpoch = ref<number>(Date.now());
const budgetEndEpoch = ref<number>(Date.now());
const budgetIncludeExpenses = ref<boolean>(true);
const budgetIncludeAssetPurchases = ref<boolean>(false);
const budgetTagIdWhiteList = ref<string[]>([]);
const budgetTagIdBlackList = ref<string[]>([]);
const budgetCurrencyId = ref<string | null>(null);
const budgetedPeriodList = ref<BudgetedPeriod[]>([]);
const budgetRollOverRule = ref<string>(defaultRollOverRule);
const budgetCurrencySign = ref<string | null>(null);
const budgetIsFeatured = ref<boolean>(false);
const budgetFrequency = ref<"monthly" | "irregular">(defaultBudgetFrequency);
const monthlyStartDate = ref<number | undefined>(undefined);
const monthlyEndDate = ref<number | undefined>(undefined);

const tableColumns = [
  {
    name: "startDate",
    label: "Start Date",
    field: "startEpoch",
    align: "left",
  },
  {
    name: "endDate",
    label: "End Date",
    field: "endEpoch",
    align: "left",
  },
  {
    name: "allocated",
    label: "Allocated Amount",
    field: "allocatedAmount",
    align: "right",
  },
  {
    name: "rolledOver",
    label: "Rolled Over",
    field: "rolledOverAmount",
    align: "right",
  },
  {
    name: "total",
    label: "Total Allocated",
    field: "totalAllocatedAmount",
    align: "right",
  },
  {
    name: "used",
    label: "Used Amount",
    field: "usedAmount",
    align: "right",
  },
  {
    name: "held",
    label: "Reserved Amount",
    field: "heldAmount",
    align: "right",
  },
  {
    name: "remaining",
    label: "Remaining",
    field: "remainingAmount",
    align: "right",
  },
];

// Methods

function prefillBudget(res: RollingBudget) {
  budgetName.value = res.name;
  budgetIncludeExpenses.value = res.includeExpenses;
  budgetIncludeAssetPurchases.value = res.includeAssetPurchases;
  budgetTagIdWhiteList.value = res.tagIdWhiteList;
  budgetTagIdBlackList.value = res.tagIdBlackList;
  budgetCurrencyId.value = res.currencyId;
  budgetedPeriodList.value = res.budgetedPeriodList;
  budgetRollOverRule.value = res.rollOverRule;
  budgetIsFeatured.value = res.isFeatured;
  budgetFrequency.value = res.frequency;

  // Load monthly date range if frequency is monthly
  if (res.frequency === "monthly") {
    monthlyStartDate.value = res.monthlyStartDate || undefined;
    monthlyEndDate.value = res.monthlyEndDate || undefined;
  }
}

function addPeriod() {
  budgetedPeriodList.value.push({
    startEpoch: budgetStartEpoch.value,
    endEpoch: budgetEndEpoch.value,
    title: "Untitled",
    allocatedAmount: 0,
    rolledOverAmount: 0,
    totalAllocatedAmount: 0,
    usedAmount: 0,
    remainingAmount: 0,
    heldAmount: 0,
    calculatedEpoch: Date.now(),
  });
}

function removePeriod(index: number) {
  budgetedPeriodList.value.splice(index, 1);
}

async function calculatePeriods() {
  budgetedPeriodList.value = budgetedPeriodList.value.map((period) => ({
    calculatedEpoch: Date.now(),
    startEpoch: normalizeEpochAsDate(period.startEpoch),
    endEpoch: normalizeEpochAsDate(period.endEpoch),
    title: `${prettifyDate(period.startEpoch)} to ${prettifyDate(period.endEpoch)}`,
    allocatedAmount: asAmount(period.allocatedAmount),
    rolledOverAmount: asAmount(period.rolledOverAmount),
    totalAllocatedAmount: asAmount(period.totalAllocatedAmount),
    usedAmount: asAmount(period.usedAmount),
    heldAmount: asAmount(period.heldAmount),
    remainingAmount: asAmount(period.remainingAmount),
  }));

  budgetedPeriodList.value = budgetedPeriodList.value.sort((a, b) => a.startEpoch - b.startEpoch);

  let rollingBudget: RollingBudget = {
    $collection: Collection.ROLLING_BUDGET,
    name: budgetName.value!,
    includeExpenses: budgetIncludeExpenses.value,
    includeAssetPurchases: budgetIncludeAssetPurchases.value,
    tagIdWhiteList: budgetTagIdWhiteList.value,
    tagIdBlackList: budgetTagIdBlackList.value,
    currencyId: budgetCurrencyId.value!,
    frequency: budgetFrequency.value,
    budgetedPeriodList: budgetedPeriodList.value,
    rollOverRule: budgetRollOverRule.value as "always" | "never" | "positive-only" | "negative-only",
    isFeatured: budgetIsFeatured.value,
    monthlyStartDate: budgetFrequency.value === "monthly" ? monthlyStartDate.value : null,
    monthlyEndDate: budgetFrequency.value === "monthly" ? monthlyEndDate.value : null,
  };

  await computationService.computeUsedAmountForRollingBudgetInPlace(rollingBudget);

  budgetedPeriodList.value = budgetedPeriodList.value.map((period) => ({
    ...period,
    calculatedEpoch: Date.now(),
  }));
}

async function okClicked() {
  if (!(await budgetForm.value?.validate())) {
    return;
  }

  let rollingBudget: RollingBudget = {
    $collection: Collection.ROLLING_BUDGET,
    name: budgetName.value!,
    includeExpenses: budgetIncludeExpenses.value,
    includeAssetPurchases: budgetIncludeAssetPurchases.value,
    tagIdWhiteList: budgetTagIdWhiteList.value,
    tagIdBlackList: budgetTagIdBlackList.value,
    currencyId: budgetCurrencyId.value!,
    frequency: budgetFrequency.value,
    budgetedPeriodList: budgetedPeriodList.value,
    rollOverRule: budgetRollOverRule.value as "always" | "never" | "positive-only" | "negative-only",
    isFeatured: budgetIsFeatured.value,
    monthlyStartDate: budgetFrequency.value === "monthly" ? monthlyStartDate.value : null,
    monthlyEndDate: budgetFrequency.value === "monthly" ? monthlyEndDate.value : null,
  };

  if (initialDoc) {
    rollingBudget = Object.assign({}, initialDoc, rollingBudget);
  }

  pouchdbService.upsertDoc(rollingBudget);

  onDialogOK();
}

function optionChanged(which: string) {
  if (!budgetIncludeExpenses.value && !budgetIncludeAssetPurchases.value) {
    if (which === "expenses") {
      budgetIncludeAssetPurchases.value = true;
    } else {
      budgetIncludeExpenses.value = true;
    }
  }
}

function allocatedAmountChanged(row: BudgetedPeriod) {
  row.totalAllocatedAmount = parseFloat(String(row.allocatedAmount)) + (parseFloat(String(row.rolledOverAmount)) || 0);
  row.remainingAmount = row.totalAllocatedAmount - (parseFloat(String(row.usedAmount)) || 0) - (parseFloat(String(row.heldAmount)) || 0);
}

function heldAmountChanged(row: BudgetedPeriod) {
  allocatedAmountChanged(row);
}

function onFrequencyChanged() {
  if (budgetFrequency.value === "monthly") {
    // If there are existing periods, compute the date range
    if (budgetedPeriodList.value.length > 0) {
      const sortedPeriods = [...budgetedPeriodList.value].sort((a, b) => a.startEpoch - b.startEpoch);
      const firstPeriod = sortedPeriods[0];
      const lastPeriod = sortedPeriods[sortedPeriods.length - 1];

      // Set epoch values for the date inputs
      monthlyStartDate.value = normalizeEpochAsDate(firstPeriod.startEpoch);
      monthlyEndDate.value = normalizeEpochAsDate(lastPeriod.endEpoch);
    }
  } else {
    // Clear monthly dates when switching to irregular
    monthlyStartDate.value = undefined;
    monthlyEndDate.value = undefined;
  }
}

function onMonthlyDateChanged() {
  if (budgetFrequency.value === "monthly") {
    generateMonthlyPeriodsFromDates();
  }
}

async function generateMonthlyPeriodsFromDates() {
  if (!monthlyStartDate.value || !monthlyEndDate.value) {
    await dialogService.alert("Error", "Please select both start and end dates for monthly frequency.");
    return;
  }

  const periodRanges = generateMonthlyPeriods(monthlyStartDate.value, monthlyEndDate.value);

  const periods: BudgetedPeriod[] = periodRanges.map((range) => {
    // Find matching existing period by date range
    const existingPeriod = budgetedPeriodList.value.find(
      (existing) =>
        normalizeEpochAsDate(existing.startEpoch) === normalizeEpochAsDate(range.startEpoch) &&
        normalizeEpochAsDate(existing.endEpoch) === normalizeEpochAsDate(range.endEpoch)
    );

    return {
      startEpoch: range.startEpoch,
      endEpoch: range.endEpoch,
      title: `${prettifyDate(range.startEpoch)} to ${prettifyDate(range.endEpoch)}`,
      allocatedAmount: existingPeriod?.allocatedAmount || 0,
      rolledOverAmount: existingPeriod?.rolledOverAmount || 0,
      totalAllocatedAmount: existingPeriod?.totalAllocatedAmount || 0,
      usedAmount: existingPeriod?.usedAmount || 0,
      remainingAmount: existingPeriod?.remainingAmount || 0,
      heldAmount: existingPeriod?.heldAmount || 0,
      calculatedEpoch: existingPeriod?.calculatedEpoch || Date.now(),
    };
  });

  budgetedPeriodList.value = periods;
}

// Watchers

watch(budgetCurrencyId, async (newCurrencyId: any) => {
  if (!newCurrencyId) {
    budgetCurrencySign.value = null;
    return;
  }
  let currency = await entityService.getCurrency(newCurrencyId);
  budgetCurrencySign.value = currency.sign;
});

// Prefill logic
onMounted(() => {
  if (props.existingBudgetId) {
    isLoading.value = true;
    (async function () {
      if (props.existingBudgetId) {
        let res = (await pouchdbService.getDocById(props.existingBudgetId)) as RollingBudget;
        initialDoc = res;
        prefillBudget(res);
        onFrequencyChanged();
      }
      isLoading.value = false;
    })();
  } else if (props.prefill) {
    isLoading.value = true;
    (async function () {
      let res = props.prefill as RollingBudget;
      prefillBudget(res);
      onFrequencyChanged();
      isLoading.value = false;
    })();
  } else {
    onFrequencyChanged();
  }
});
</script>
<style scoped lang="scss">
.budgeted-period-table {
  width: 100%;
  // margin: 1rem 0;

  :deep(.q-table__top) {
    padding: 8px 0;
  }

  :deep(.q-table__container) {
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  :deep(.currency-label) {
    padding: 0 4px;
  }
}

.custom-group {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}
</style>
