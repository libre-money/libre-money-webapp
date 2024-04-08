<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section v-if="filters">
        <div class="std-dialog-title q-pa-md">Filters</div>
        <q-select filled v-model="selectedPreset" :options="dateRangePresetList" label="Preset" emit-value
          map-options />
        <div class="row no-wrap" style="margin-top: 8px">
          <date-input v-model="filters.startEpoch" label="Start Date"
            @update:model-value="startEpochChanged"></date-input>
          <date-input v-model="filters.endEpoch" label="End Date" @update:model-value="endEpochChanged"
            style="margin-left: 4px"></date-input>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <q-btn color="primary" label="OK" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { useDialogPluginComponent } from "quasar";
import DateInput from "src/components/lib/DateInput.vue";
import { dateRangePresetList, partyTypeList } from "src/constants/constants";
import { AccJournalFilters } from "src/models/accounting/acc-journal-filters";
import { getStartAndEndEpochFromPreset } from "src/utils/date-range-preset-utils";
import { validators } from "src/utils/validators";
import { Ref, ref, watch } from "vue";

export default {
  props: {
    inputFilters: {
      type: Object,
      required: false,
      default: null,
    },
  },

  components: { DateInput },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const isLoading = ref(false);

    const filters: Ref<AccJournalFilters | null> = ref(null);

    const selectedPreset: Ref<string | null> = ref("current-year");

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    isLoading.value = true;
    if (props.inputFilters) {
      filters.value = props.inputFilters as AccJournalFilters;
    } else {
      filters.value = {
        startEpoch: Date.now(),
        endEpoch: Date.now(),
      };
    }
    isLoading.value = false;

    async function okClicked() {
      onDialogOK(filters.value);
    }

    async function startEpochChanged() {
      selectedPreset.value = "custom";
    }

    async function endEpochChanged() {
      selectedPreset.value = "custom";
    }

    function applyPreset(newPreset: string) {
      const range = getStartAndEndEpochFromPreset(newPreset);
      if (range) {
        const { startEpoch, endEpoch } = range;
        [filters.value!.startEpoch, filters.value!.endEpoch] = [startEpoch, endEpoch];
      }
    }

    watch(selectedPreset, async (newPreset: any) => {
      applyPreset(newPreset);
    });

    applyPreset(selectedPreset.value!);

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      partyTypeList,
      validators,
      filters,
      dateRangePresetList,
      selectedPreset,
      startEpochChanged,
      endEpochChanged,
    };
  },
};
</script>
<style scoped lang="scss"></style>
