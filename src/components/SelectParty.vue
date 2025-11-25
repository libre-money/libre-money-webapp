<script setup lang="ts">
import { Collection } from "src/constants/constants";
import { Party } from "src/models/party";
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
const partyList: Ref<Party[]> = ref([]);
const fullPartyList: Ref<Party[]> = ref([]);

async function loadData() {
  isLoading.value = true;
  fullPartyList.value = (await pouchdbService.listByCollection(Collection.PARTY)).docs as Party[];
  fullPartyList.value.sort((a, b) => a.name.localeCompare(b.name));

  partyList.value = fullPartyList.value;
  isLoading.value = false;
  setTimeout(() => {
    if (fullPartyList.value.length && !value.value && props.mandatory) {
      value.value = fullPartyList.value[0]._id;
    }
  }, 10);
}

loadData();

function filterPartyFn(val: string, update: any, abort: any) {
  update(() => {
    const needle = val.toLowerCase();
    partyList.value = fullPartyList.value.filter((party) => {
      return party.name.toLowerCase().includes(needle);
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
    :options="partyList"
    label="Party / Vendor"
    emit-value
    map-options
    fill-input
    use-input
    input-debounce="0"
    @filter="filterPartyFn"
    class="std-margin-bottom-32"
    option-value="_id"
    option-label="name"
    hide-selected
    v-if="!isLoading"
    :clearable="!mandatory"
  />
</template>
