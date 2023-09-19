<script setup lang="ts">
import { Collection } from "src/constants/constants";
import { IncomeSource } from "src/models/income-source";
import { pouchdbService } from "src/services/pouchdb-service";
import { Ref, computed, ref } from "vue";

const props = defineProps(["modelValue"]);
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
const walletIncomeSourceList: Ref<IncomeSource[]> = ref([]);
const fullWalletIncomeSourceList: Ref<IncomeSource[]> = ref([]);

async function loadData() {
  isLoading.value = true;
  fullWalletIncomeSourceList.value = (await pouchdbService.listByCollection(Collection.INCOME_SOURCE)).docs as IncomeSource[];
  walletIncomeSourceList.value = fullWalletIncomeSourceList.value;
  isLoading.value = false;
  setTimeout(() => {
    if (fullWalletIncomeSourceList.value.length && !value.value) {
      value.value = fullWalletIncomeSourceList.value[0]._id;
    }
  }, 10);
}

loadData();

function filterIncomeSourceFn(val: string, update: any, abort: any) {
  update(() => {
    const needle = val.toLowerCase();
    walletIncomeSourceList.value = fullWalletIncomeSourceList.value.filter((incomeSource) => {
      return incomeSource.name.toLowerCase().includes(needle);
    });
  });
}
</script>

<template>
  <div style="text-align: center" v-if="isLoading">
    <q-spinner color="primary" size="40px" :thickness="4" />
  </div>

  <q-select
    filled
    v-model="value"
    :options="walletIncomeSourceList"
    label="Income Source"
    emit-value
    map-options
    fill-input
    use-input
    input-debounce="0"
    @filter="filterIncomeSourceFn"
    class="std-margin-bottom-32"
    option-value="_id"
    option-label="name"
    hide-selected
    v-if="!isLoading"
  />
</template>
