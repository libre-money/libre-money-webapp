<script setup lang="ts">
import { Collection } from "src/constants/constants";
import { Wallet } from "src/models/wallet";
import { Party } from "src/models/party";
import { pouchdbService } from "src/services/pouchdb-service";
import { Ref, computed, ref, watch } from "vue";

const props = defineProps(["modelValue", "label", "limitByCurrencyId"]);
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

const limitByCurrencyId = computed({
  get() {
    return props.limitByCurrencyId;
  },
  set(value) {
    return null;
  },
});

const isLoading: Ref<boolean> = ref(true);
const walletList: Ref<Wallet[]> = ref([]);
const fullWalletList: Ref<Wallet[]> = ref([]);

async function loadData() {
  isLoading.value = true;

  let list = (await pouchdbService.listByCollection(Collection.WALLET)).docs as Wallet[];
  list.sort((a, b) => a.name.localeCompare(b.name));
  if (props.limitByCurrencyId) {
    list = list.filter((item) => item.currencyId === props.limitByCurrencyId);
  }
  fullWalletList.value = list;
  walletList.value = fullWalletList.value;
  isLoading.value = false;
  setTimeout(() => {
    let isSelectedValueValid = value.value && walletList.value.find((_w) => _w._id === value.value);
    if ((walletList.value.length && !value.value) || (value.value && !isSelectedValueValid)) {
      value.value = walletList.value[0]._id;
    }
  }, 10);
}

loadData();

function filterWalletFn(val: string, update: any, abort: any) {
  update(() => {
    const needle = val.toLowerCase();
    walletList.value = fullWalletList.value.filter((wallet) => {
      return wallet.name.toLowerCase().includes(needle);
    });
  });
}

watch(limitByCurrencyId, () => {
  loadData();
});
</script>

<template>
  <div style="text-align: center" v-if="isLoading">
    <q-spinner color="primary" size="40px" :thickness="4" />
  </div>

  <q-select
    filled
    v-model="value"
    :options="walletList"
    :label="label || 'Wallet'"
    emit-value
    map-options
    fill-input
    use-input
    input-debounce="0"
    @filter="filterWalletFn"
    class="std-margin-bottom-32"
    option-value="_id"
    option-label="name"
    hide-selected
    v-if="!isLoading"
  />
</template>
