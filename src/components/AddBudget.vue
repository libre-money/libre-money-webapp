<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingBudgetId ? "Editing a Budget" : "Adding a Budget" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="budgetForm">
          <q-input filled v-model="budgetName" label="Name of the Budget" lazy-rules :rules="validators.name" />
          <date-time-input v-model="budgetStartEpoch" label="Start Date"></date-time-input>
          <date-time-input v-model="budgetEndEpoch" label="Start Date"></date-time-input>
          <select-currency v-model="budgetCurrencyId"></select-currency>
          <q-input type="number" filled v-model="budgetOverflowLimit" label="Limit" lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">{{ budgetCurrencySign }}</div>
            </template>
          </q-input>
          <q-input type="number" filled v-model="budgetWarningLimit" label="Warning Limit" lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">{{ budgetCurrencySign }}</div>
            </template>
          </q-input>
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
import { Ref, ref, watch } from "vue";
import { validators } from "src/utils/validators";
import { Collection } from "src/constants/constants";
import { Budget } from "src/models/budget";
import { pouchdbService } from "src/services/pouchdb-service";
import { Party } from "src/models/party";
import SelectCurrency from "./SelectCurrency.vue";
import { dataInferenceService } from "src/services/data-inference-service";
import DateTimeInput from "./lib/DateTimeInput.vue";
import SelectTag from "./SelectTag.vue";

export default {
  props: {
    existingBudgetId: {
      type: String,
      required: false,
      default: null,
    },
  },

  components: {
    SelectCurrency,
    DateTimeInput,
    SelectTag,
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    let initialDoc: Budget | null = null;

    const isLoading = ref(false);

    const budgetForm: Ref<QForm | null> = ref(null);

    const budgetName: Ref<string | null> = ref(null);
    const budgetStartEpoch: Ref<number> = ref(Date.now());
    const budgetEndEpoch: Ref<number> = ref(Date.now());
    const budgetIncludeExpenses: Ref<boolean> = ref(true);
    const budgetIncludeAssetPurchases: Ref<boolean> = ref(false);
    const budgetTagIdWhiteList: Ref<string[]> = ref([]);
    const budgetTagIdBlackList: Ref<string[]> = ref([]);
    const budgetWarningLimit: Ref<number | null> = ref(null);
    const budgetOverflowLimit: Ref<number | null> = ref(null);
    const budgetCurrencyId: Ref<string | null> = ref(null);

    const budgetCurrencySign: Ref<string | null> = ref(null);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    if (props.existingBudgetId) {
      isLoading.value = true;
      (async function () {
        let res = (await pouchdbService.getDocById(props.existingBudgetId)) as Budget;
        initialDoc = res;
        budgetName.value = res.name;
        budgetStartEpoch.value = res.startEpoch;
        budgetEndEpoch.value = res.endEpoch;
        budgetOverflowLimit.value = res.overflowLimit;
        budgetWarningLimit.value = res.warningLimit;
        budgetIncludeExpenses.value = res.includeExpenses;
        budgetIncludeAssetPurchases.value = res.includeAssetPurchases;
        budgetTagIdWhiteList.value = res.tagIdWhiteList;
        budgetTagIdBlackList.value = res.tagIdBlackList;
        budgetCurrencyId.value = res.currencyId;

        isLoading.value = false;
      })();
    }
    async function okClicked() {
      if (!(await budgetForm.value?.validate())) {
        return;
      }

      let budget: Budget = {
        $collection: Collection.BUDGET,
        name: budgetName.value!,
        startEpoch: budgetStartEpoch.value!,
        endEpoch: budgetEndEpoch.value!,
        overflowLimit: budgetOverflowLimit.value!,
        warningLimit: budgetWarningLimit.value!,
        includeExpenses: budgetIncludeExpenses.value,
        includeAssetPurchases: budgetIncludeAssetPurchases.value,
        tagIdWhiteList: budgetTagIdWhiteList.value,
        tagIdBlackList: budgetTagIdBlackList.value,
        currencyId: budgetCurrencyId.value!,
      };

      if (initialDoc) {
        budget = Object.assign({}, initialDoc, budget);
      }

      pouchdbService.upsertDoc(budget);

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

    watch(budgetCurrencyId, async (newCurrencyId: any) => {
      let currency = await dataInferenceService.getCurrency(newCurrencyId);
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
      budgetWarningLimit,
      budgetOverflowLimit,
      budgetCurrencyId,
      budgetCurrencySign,
      DateTimeInput,
      SelectTag,
      optionChanged,
    };
  },
};
</script>
<style scoped lang="ts"></style>
