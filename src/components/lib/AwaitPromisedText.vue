<template>
  {{ promiseValue }}
</template>

<script setup lang="ts">
import { ref, Ref } from "vue";

const props = defineProps<{
  promise: Promise<any>;
}>();

const promiseValue: Ref<any> = ref(null);

try {
  props.promise
    .then((value) => (promiseValue.value = value))
    .catch((ex) => {
      console.error(ex);
      promiseValue.value = "Error";
    });
} catch (ex) {
  console.error(ex);
  promiseValue.value = "Error";
}
</script>
