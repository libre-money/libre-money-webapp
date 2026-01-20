<script setup lang="ts">
import { Collection } from "src/constants/constants";
import { Currency } from "src/schemas/currency";
import { pouchdbService } from "src/services/pouchdb-service";
import { Ref, computed, ref } from "vue";

const props = defineProps({
  modelValue: {},
  label: String,
  mandatory: {
    type: Boolean,
    default: true,
  },
  shorthand: {
    type: Boolean,
    default: false,
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

const label = computed({
  get() {
    return props.label;
  },
  set(value) {
    return null;
  },
});

const isLoading: Ref<boolean> = ref(true);
const walletCurrencyList: Ref<Currency[]> = ref([]);
const fullWalletCurrencyList: Ref<Currency[]> = ref([]);

async function loadData() {
  isLoading.value = true;
  fullWalletCurrencyList.value = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
  fullWalletCurrencyList.value.sort((a, b) => a.name.localeCompare(b.name));

  walletCurrencyList.value = fullWalletCurrencyList.value;
  isLoading.value = false;
  setTimeout(() => {
    if (fullWalletCurrencyList.value.length && !value.value) {
      if (props.mandatory) {
        value.value = fullWalletCurrencyList.value[0]._id;
      }
    }
  }, 10);
}

loadData();

function filterCurrencyFn(val: string, update: any, abort: any) {
  update(() => {
    const needle = val.toLowerCase();
    walletCurrencyList.value = fullWalletCurrencyList.value.filter((currency) => {
      return currency.name.toLowerCase().includes(needle);
    });
  });
}
</script>

<template>
  <div style="text-align: center" v-if="isLoading">
    <q-spinner color="primary" size="40px" :thickness="4" />
  </div>

  <q-select
    standout="bg-grey-7 text-white"
    v-model="value"
    :options="walletCurrencyList"
    :label="label || 'Currency'"
    emit-value
    map-options
    fill-input
    use-input
    input-debounce="0"
    @filter="filterCurrencyFn"
    option-value="_id"
    :option-label="props.shorthand ? 'sign' : 'name'"
    hide-selected
    v-if="!isLoading"
    :clearable="!mandatory"
  />
</template>
