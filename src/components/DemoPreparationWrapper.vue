<template>
  <div v-if="demoPreparationEnabled">
    <DemoPreparation @close="handleClose" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { DEMO_PREPARATION_ENABLED } from "src/constants/config-constants";
import DemoPreparation from "./DemoPreparation.vue";

// Computed properties
const demoPreparationEnabled = computed(() => DEMO_PREPARATION_ENABLED);

// Methods
const handleClose = () => {
  // Handle close event from DemoPreparation component
  console.log("Demo preparation component closed");
};
</script>
