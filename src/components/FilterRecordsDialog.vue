<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section v-if="recordFilters">
        <div class="std-dialog-title" style="padding-bottom: 8px;">Filters</div>
        <q-select filled v-model="selectedPreset" :options="dateRangePresetList" label="Preset" emit-value
          map-options />
        <div class="row no-wrap" style="margin-top: 8px">
          <date-input v-model="recordFilters.startEpoch" label="Start Date"
            @update:model-value="startEpochChanged"></date-input>
          <date-input v-model="recordFilters.endEpoch" label="End Date" @update:model-value="endEpochChanged"
            style="margin-left: 4px"></date-input>
        </div>
        <br />
        <div style="margin-top: -12px">
          <select-record-type v-model="recordFilters.recordTypeList" />
        </div>
        <div style="margin-top: -20px">
          <select-party v-model="recordFilters.partyId" :mandatory="false"></select-party>
        </div>
        <div style="margin-top: -20px">
          <select-tag v-model="recordFilters.tagIdWhiteList" label="Include only if contains tags"></select-tag>
        </div>
        <div style="margin-top: -20px">
          <select-tag v-model="recordFilters.tagIdBlackList" label="Exclude if contains tags"></select-tag>
        </div>
        <div style="margin-top: -20px">
          <select-wallet v-model="recordFilters.walletId"></select-wallet>
        </div>
        <div style="margin-top: -20px">
          <q-input filled v-model="recordFilters.searchString" label="Search in notes" />
        </div>
        <div style="margin-top: 12px">
          <q-input filled v-model="recordFilters.deepSearchString" label="Deep search (advanced)" />
        </div>
        <div style="margin-top: 12px; margin-bottom: 12px">
          <q-select filled v-model="recordFilters.sortBy" :options="sortByTypeList" label="Sort by" emit-value
            map-options />
        </div>
      </q-card-section>

      <q-card-actions class="row justify-start std-bottom-action-row-alt">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <div class="spacer"></div>
        <q-btn color="primary" label="Apply Filters" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { useDialogPluginComponent } from "quasar";
import DateInput from "src/components/lib/DateInput.vue";
import { dateRangePresetList, partyTypeList, sortByTypeList } from "src/constants/constants";
import { RecordFilters } from "src/models/inferred/record-filters";
import { getStartAndEndEpochFromPreset } from "src/utils/date-range-preset-utils";
import { validators } from "src/utils/validators";
import { Ref, ref, watch } from "vue";
import SelectParty from "./SelectParty.vue";
import SelectRecordType from "./SelectRecordType.vue";
import SelectTag from "./SelectTag.vue";
import SelectWallet from "./SelectWallet.vue";

export default {
  props: {
    inputFilters: {
      type: Object,
      required: false,
      default: null,
    },
  },

  components: { DateInput, SelectRecordType, SelectParty, SelectTag, SelectWallet },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const isLoading = ref(false);

    const recordFilters: Ref<RecordFilters | null> = ref(null);

    const selectedPreset: Ref<string | null> = ref("current-year");

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    isLoading.value = true;
    if (props.inputFilters) {
      recordFilters.value = props.inputFilters as RecordFilters;
    } else {
      recordFilters.value = {
        startEpoch: Date.now(),
        endEpoch: Date.now(),
        recordTypeList: [],
        tagIdWhiteList: [],
        tagIdBlackList: [],
        partyId: null,
        walletId: null,
        searchString: "",
        deepSearchString: "",
        sortBy: "transactionEpochDesc"
      };
    }
    isLoading.value = false;

    async function okClicked() {
      onDialogOK(recordFilters.value);
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
        [recordFilters.value!.startEpoch, recordFilters.value!.endEpoch] = [startEpoch, endEpoch];
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
      recordFilters,
      dateRangePresetList,
      selectedPreset,
      startEpochChanged,
      endEpochChanged,
      sortByTypeList
    };
  },
};
</script>
<style scoped lang="scss"></style>
