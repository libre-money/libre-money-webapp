<script setup lang="ts">
import { Collection } from "src/constants/constants";
import { Tag } from "src/models/tag";
import { pouchdbService } from "src/services/pouchdb-service";
import { Ref, computed, ref } from "vue";

const props = defineProps(["modelValue", "label"]);
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
const tagTagList: Ref<Tag[]> = ref([]);
const fullTagTagList: Ref<Tag[]> = ref([]);

const mvalue: any = ref(null);

async function loadData() {
  isLoading.value = true;
  fullTagTagList.value = (await pouchdbService.listByCollection(Collection.TAG)).docs as Tag[];
  tagTagList.value = fullTagTagList.value;
  isLoading.value = false;
  setTimeout(() => {
    if (fullTagTagList.value.length && !value.value) {
      value.value = fullTagTagList.value[0]._id;
    }
  }, 10);
}

loadData();

function createValue(val: string, done: any) {
  console.debug("createValue", { val });
  if (val.length > 2) {
    if (!fullTagTagList.value.find((tag) => tag.name.toLowerCase().includes(val))) {
      done(val, "add-unique");
    }
  }
}

function filterTagFn(val: string, update: any, abort: any) {
  update(() => {
    console.debug("filterTagFn", { val });
    const needle = val.toLowerCase();
    tagTagList.value = fullTagTagList.value.filter((tag) => {
      return tag.name.toLowerCase().includes(needle);
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
    :options="tagTagList"
    :label="label || 'Tags'"
    emit-value
    map-options
    use-input
    input-debounce="0"
    @filter="filterTagFn"
    class="std-margin-bottom-32"
    option-value="_id"
    option-label="name"
    v-if="!isLoading"
    use-chips
    multiple
    @new-value="createValue"
  />
</template>
