<script setup lang="ts">
import { Collection } from "src/constants/constants";
import { ExpenseAvenue } from "src/schemas/expense-avenue";
import { pouchdbService } from "src/services/pouchdb-service";
import { Ref, computed, ref } from "vue";

const props = defineProps({
  modelValue: {},
  mandatory: {
    type: Boolean,
    default: true,
  },
});
const emit = defineEmits(["update:modelValue"]);

const value = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit("update:modelValue", value);
  },
});

const isLoading: Ref<boolean> = ref(true);
const walletExpenseAvenueList: Ref<ExpenseAvenue[]> = ref([]);
const fullWalletExpenseAvenueList: Ref<ExpenseAvenue[]> = ref([]);

async function loadData() {
  isLoading.value = true;
  fullWalletExpenseAvenueList.value = (await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE)).docs as ExpenseAvenue[];
  fullWalletExpenseAvenueList.value.sort((a, b) => a.name.localeCompare(b.name));

  walletExpenseAvenueList.value = fullWalletExpenseAvenueList.value;
  isLoading.value = false;
  setTimeout(() => {
    if (fullWalletExpenseAvenueList.value.length && !value.value) {
      if (props.mandatory) {
        value.value = fullWalletExpenseAvenueList.value[0]._id;
      }
    }
  }, 10);
}

loadData();

function filterExpenseAvenueFn(val: string, update: any, abort: any) {
  update(() => {
    const needle = val.toLowerCase();
    walletExpenseAvenueList.value = fullWalletExpenseAvenueList.value.filter((expenseAvenue) => {
      return expenseAvenue.name.toLowerCase().includes(needle);
    });
  });
}
</script>

<template>
  <div style="text-align: center" v-if="isLoading">
    <q-spinner color="primary" size="40px" :thickness="4" />
  </div>

  <q-select
    standout="bg-primary text-white"
    v-model="value"
    :options="walletExpenseAvenueList"
    label="Expense Avenue"
    emit-value
    map-options
    fill-input
    use-input
    input-debounce="0"
    @filter="filterExpenseAvenueFn"
    option-value="_id"
    option-label="name"
    hide-selected
    behavior="menu"
    v-if="!isLoading"
    :clearable="!mandatory"
  />
</template>
