<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section v-if="filters">
        <div class="std-dialog-title q-pa-md">Filters</div>
        <q-select filled v-model="selectedPreset" :options="dateRangePresetList" label="Preset" emit-value map-options />
        <div class="row no-wrap" style="margin-top: 8px">
          <date-input v-model="filters.startEpoch" label="Start Date" @update:model-value="startEpochChanged"></date-input>
          <date-input v-model="filters.endEpoch" label="End Date" @update:model-value="endEpochChanged" style="margin-left: 4px"></date-input>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Cancel" @click="onDialogCancel" />
        <q-btn color="primary" label="OK" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar";
import DateInput from "src/components/lib/DateInput.vue";
import { dateRangePresetList } from "src/constants/constants";
import { AccStatementFilters } from "src/models/accounting/acc-statement-filters";
import { getStartAndEndEpochFromPreset } from "src/utils/date-range-preset-utils";
import { defineEmits, defineProps, ref, watch } from "vue";

// Props
const props = defineProps<{
  inputFilters?: AccStatementFilters | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// State
const isLoading = ref(false);
const filters = ref<AccStatementFilters | null>(null);
const selectedPreset = ref<string | null>("current-year");

// Initialize filters
isLoading.value = true;
if (props.inputFilters) {
  filters.value = props.inputFilters as AccStatementFilters;
} else {
  filters.value = {
    startEpoch: Date.now(),
    endEpoch: Date.now(),
  };
}
isLoading.value = false;

// Methods
function okClicked() {
  onDialogOK(filters.value);
}

function startEpochChanged() {
  selectedPreset.value = "custom";
}

function endEpochChanged() {
  selectedPreset.value = "custom";
}

function applyPreset(newPreset: string) {
  const range = getStartAndEndEpochFromPreset(newPreset);
  if (range && filters.value) {
    const { startEpoch, endEpoch } = range;
    [filters.value.startEpoch, filters.value.endEpoch] = [startEpoch, endEpoch];
  }
}

// Watchers
watch(selectedPreset, (newPreset) => {
  if (newPreset) {
    applyPreset(newPreset);
  }
});

// Apply initial preset
applyPreset(selectedPreset.value!);
</script>
<style scoped lang="scss"></style>
