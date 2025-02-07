<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingBudgetId ? "Editing a Rolling Budget" : "Adding a Rolling Budget" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="budgetForm">
          <q-input filled v-model="budgetName" label="Name of the Rolling Budget" lazy-rules :rules="validators.name" />
          <select-currency v-model="budgetCurrencyId"></select-currency>
          <q-checkbox v-model="budgetIsFeatured" label="Show in Records Page" @update:model-value="optionChanged('featured')" />
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
                  {{ props.row.rolledOverAmount }}
                </q-td>
                <q-td key="total" :props="props">
                  {{ props.row.totalAllocatedAmount }}
                </q-td>
                <q-td key="used" :props="props">
                  {{ props.row.usedAmount }}
                </q-td>
                <q-td key="remaining" :props="props">
                  {{ props.row.remainingAmount }}
                </q-td>
                <q-td auto-width>
                  <q-btn size="sm" color="negative" round dense icon="delete" @click="removePeriod(props.rowIndex)" />
                </q-td>
              </q-tr>
            </template>
            <template v-slot:top>
              <div class="row q-gutter-sm">
                <q-btn color="primary" label="Add Period" @click="addPeriod" />
                <q-btn color="secondary" label="Sort & (re)Calculate" @click="calculatePeriods" />
              </div>
            </template>
          </q-table>

          <q-checkbox v-model="budgetIncludeExpenses" label="Apply to Expenses" @update:model-value="optionChanged('expenses')" />
          <q-checkbox v-model="budgetIncludeAssetPurchases" label="Apply to Asset Purchases" @update:model-value="optionChanged('assetPurchases')" />
          <select-tag v-model="budgetTagIdWhiteList" label="Only include records with these tags"></select-tag>
          <select-tag v-model="budgetTagIdBlackList" label="Exclude records with these tags"></select-tag>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <q-btn color="primary" label="OK" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { UNBUDGETED_RECORDS_BUDGET_NAME } from "src/constants/config-constants";
import { Collection, defaultRollOverRule, rollOverRuleList } from "src/constants/constants";
import { BudgetedPeriod, RollingBudget } from "src/models/rolling-budget";
import { dialogService } from "src/services/dialog-service";
import { entityService } from "src/services/entity-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { validators } from "src/utils/validators";
import { Ref, ref, watch } from "vue";
import DateInput from "./lib/DateInput.vue";
import SelectCurrency from "./SelectCurrency.vue";
import SelectTag from "./SelectTag.vue";
import { asAmount, prettifyDate } from "src/utils/misc-utils";
import { computationService } from "src/services/computation-service";
import { normalizeEpochAsDate } from "src/utils/date-utils";
export default {
  props: {
    existingBudgetId: {
      type: String,
      required: false,
      default: null,
    },
    prefill: {
      type: Object,
      required: false,
      default: null,
    },
  },

  components: {
    SelectCurrency,
    DateInput,
    SelectTag,
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    let initialDoc: RollingBudget | null = null;

    const isLoading = ref(false);

    const budgetForm: Ref<QForm | null> = ref(null);

    const budgetName: Ref<string | null> = ref(null);
    const budgetStartEpoch: Ref<number> = ref(Date.now());
    const budgetEndEpoch: Ref<number> = ref(Date.now());
    const budgetIncludeExpenses: Ref<boolean> = ref(true);
    const budgetIncludeAssetPurchases: Ref<boolean> = ref(false);
    const budgetTagIdWhiteList: Ref<string[]> = ref([]);
    const budgetTagIdBlackList: Ref<string[]> = ref([]);
    const budgetCurrencyId: Ref<string | null> = ref(null);
    const budgetedPeriodList: Ref<BudgetedPeriod[]> = ref([]);
    const newPeriodAmount: Ref<number> = ref(0);
    const budgetRollOverRule: Ref<string> = ref(defaultRollOverRule);
    const budgetCurrencySign: Ref<string | null> = ref(null);
    const budgetIsFeatured: Ref<boolean> = ref(false);
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
        name: "remaining",
        label: "Remaining",
        field: "remainingAmount",
        align: "right",
      },
    ];

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

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
    }

    function addPeriod() {
      budgetedPeriodList.value.push({
        startEpoch: budgetStartEpoch.value,
        endEpoch: budgetEndEpoch.value,
        title: "Untitled",
        allocatedAmount: newPeriodAmount.value,
        rolledOverAmount: 0,
        totalAllocatedAmount: newPeriodAmount.value,
        usedAmount: 0,
        remainingAmount: newPeriodAmount.value,
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
        frequency: "monthly",
        budgetedPeriodList: budgetedPeriodList.value,
        rollOverRule: budgetRollOverRule.value as "always" | "never" | "positive-only" | "negative-only",
        isFeatured: budgetIsFeatured.value,
      };

      await computationService.computeUsedAmountForRollingBudgetInPlace(rollingBudget);

      budgetedPeriodList.value = budgetedPeriodList.value.map((period) => ({
        ...period,
        calculatedEpoch: Date.now(),
      }));
    }

    if (props.existingBudgetId) {
      isLoading.value = true;
      (async function () {
        let res = (await pouchdbService.getDocById(props.existingBudgetId)) as RollingBudget;
        initialDoc = res;
        prefillBudget(res);
        isLoading.value = false;
      })();
    }

    if (props.prefill) {
      isLoading.value = true;
      (async function () {
        let res = props.prefill as RollingBudget;
        prefillBudget(res);
        isLoading.value = false;
      })();
    }

    async function okClicked() {
      if (!(await budgetForm.value?.validate())) {
        return;
      }

      if (budgetName.value === UNBUDGETED_RECORDS_BUDGET_NAME) {
        dialogService.alert("Error", "Cannot create rolling budget with name " + UNBUDGETED_RECORDS_BUDGET_NAME + ".");
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
        frequency: "monthly",
        budgetedPeriodList: budgetedPeriodList.value,
        rollOverRule: budgetRollOverRule.value as "always" | "never" | "positive-only" | "negative-only",
        isFeatured: budgetIsFeatured.value,
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
      row.remainingAmount = row.totalAllocatedAmount - (parseFloat(String(row.usedAmount)) || 0);
    }

    watch(budgetCurrencyId, async (newCurrencyId: any) => {
      let currency = await entityService.getCurrency(newCurrencyId);
      budgetCurrencySign.value = currency.sign;
    });

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      validators,
      budgetForm,
      budgetName,
      budgetStartEpoch,
      budgetEndEpoch,
      budgetIncludeExpenses,
      budgetIncludeAssetPurchases,
      budgetTagIdWhiteList,
      budgetTagIdBlackList,
      budgetCurrencyId,
      budgetCurrencySign,
      budgetedPeriodList,
      newPeriodAmount,
      SelectTag,
      optionChanged,
      addPeriod,
      removePeriod,
      calculatePeriods,
      tableColumns,
      prettifyDate,
      budgetRollOverRule,
      rollOverRuleList,
      allocatedAmountChanged,
      budgetIsFeatured,
    };
  },
};
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
</style>
