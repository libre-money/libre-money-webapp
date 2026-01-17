<script setup lang="ts">
import { Collection } from "src/constants/constants";
import { Asset } from "src/models/asset";
import { pouchdbService } from "src/services/pouchdb-service";
import { Ref, computed, ref } from "vue";

const props = defineProps({
  modelValue: {},
  label: String,
  limitByCurrencyId: {},
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
const assetAssetList: Ref<Asset[]> = ref([]);
const fullAssetAssetList: Ref<Asset[]> = ref([]);

async function loadData() {
  isLoading.value = true;

  let list = (await pouchdbService.listByCollection(Collection.ASSET)).docs as Asset[];
  if (props.limitByCurrencyId) {
    list = list.filter((item) => item.currencyId === props.limitByCurrencyId);
  }
  list.sort((a, b) => a.name.localeCompare(b.name));

  fullAssetAssetList.value = list;
  assetAssetList.value = fullAssetAssetList.value;
  isLoading.value = false;
  setTimeout(() => {
    if (fullAssetAssetList.value.length && !value.value) {
      if (props.mandatory) {
        value.value = fullAssetAssetList.value[0]._id;
      }
    }
  }, 10);
}

loadData();

function filterAssetFn(val: string, update: any, abort: any) {
  update(() => {
    const needle = val.toLowerCase();
    assetAssetList.value = fullAssetAssetList.value.filter((asset) => {
      return asset.name.toLowerCase().includes(needle);
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
    :options="assetAssetList"
    :label="label || 'Asset'"
    emit-value
    map-options
    fill-input
    use-input
    input-debounce="0"
    @filter="filterAssetFn"
    class="std-margin-bottom-32"
    option-value="_id"
    option-label="name"
    hide-selected
    v-if="!isLoading"
    :clearable="!mandatory"
  />
</template>
