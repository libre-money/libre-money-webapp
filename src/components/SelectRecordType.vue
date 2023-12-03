<script setup lang="ts">
import { Collection, RecordType } from "src/constants/constants";
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
const recordTypeList: Ref<{ key: string; label: string }[]> = ref([]);
const fullRecordTypeList: Ref<{ key: string; label: string }[]> = ref([]);

async function loadData() {
  isLoading.value = true;

  let list = Object.keys(RecordType).map((key) => {
    let label = key
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return {
      key,
      label,
    };
  });
  list.sort((a, b) => a.label.localeCompare(b.label));

  fullRecordTypeList.value = list;
  recordTypeList.value = fullRecordTypeList.value;
  isLoading.value = false;

  setTimeout(() => {
    if (fullRecordTypeList.value.length && !value.value) {
      value.value = fullRecordTypeList.value[0].key;
    }
  }, 10);
}

loadData();

function filterRecordTypeFn(val: string, update: any, abort: any) {
  update(() => {
    console.debug("filterRecordTypeFn", { val });
    const needle = val.toLowerCase();
    recordTypeList.value = fullRecordTypeList.value.filter((recordType) => {
      return recordType.label.toLowerCase().includes(needle);
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
    :options="recordTypeList"
    label="Record Types"
    emit-value
    map-options
    use-input
    input-debounce="0"
    @filter="filterRecordTypeFn"
    class="std-margin-bottom-32"
    option-value="key"
    option-label="label"
    v-if="!isLoading"
    use-chips
    multiple
  />
</template>
