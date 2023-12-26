<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section v-if="recordFilters">
        <div class="std-dialog-title q-pa-md">Record Filters</div>
        <q-select filled v-model="selectedPreset" :options="filterPresetList" label="Preset" emit-value map-options />
        <div class="row no-wrap" style="margin-top: 8px">
          <date-input v-model="recordFilters.startEpoch" label="Start Date" @update:model-value="startEpochChanged"></date-input>
          <date-input v-model="recordFilters.endEpoch" label="End Date" @update:model-value="endEpochChanged" style="margin-left: 4px"></date-input>
        </div>
        <br />
        <select-record-type v-model="recordFilters.recordTypeList" />
        <div style="margin-top: -12px">
          <select-party v-model="recordFilters.partyId" :mandatory="false"></select-party>
        </div>
        <div style="margin-top: -12px">
          <select-tag v-model="recordFilters.tagList"></select-tag>
        </div>
        <div style="margin-top: -12px">
          <select-wallet v-model="recordFilters.walletId"></select-wallet>
        </div>
        <div style="margin-top: -12px">
          <q-input filled v-model="recordFilters.searchString" label="Search in notes" />
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
import { QForm, useDialogPluginComponent } from "quasar";
import { Ref, ref, watch } from "vue";
import { validators } from "src/utils/validators";
import { Collection, defaultPartyType, partyTypeList } from "src/constants/constants";
import { Party } from "src/models/party";
import { pouchdbService } from "src/services/pouchdb-service";
import { RecordFilters } from "src/models/inferred/record-filters";
import DateInput from "src/components/lib/DateInput.vue";
import SelectRecordType from "./SelectRecordType.vue";
import {
  setDateToTheFirstDateOfMonth,
  setDateToTheFirstDateOfPreviousMonth,
  setDateToTheFirstDateOfPreviousYear,
  setDateToTheFirstDateOfYear,
  setDateToTheLastDateOfPreviousMonth,
  setDateToTheLastDateOfPreviousYear,
} from "src/utils/date-utils";
import SelectParty from "./SelectParty.vue";
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
        startEpoch: setDateToTheFirstDateOfYear(Date.now()),
        endEpoch: Date.now(),
        recordTypeList: [],
        tagList: [],
        partyId: null,
        walletId: null,
        searchString: "",
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

    const filterPresetList = [
      { value: "current-year", label: "Current Year" },
      { value: "previous-year", label: "Previous Year" },
      { value: "current-month", label: "Current Month" },
      { value: "previous-month", label: "Previous Month" },
      { value: "all-time", label: "All time" },
      { value: "custom", label: "Custom" },
    ];

    function applyPreset(newPreset: string) {
      if (newPreset === "current-year") {
        recordFilters.value!.startEpoch = setDateToTheFirstDateOfYear(Date.now());
        recordFilters.value!.endEpoch = Date.now();
      } else if (newPreset === "previous-year") {
        recordFilters.value!.startEpoch = setDateToTheFirstDateOfPreviousYear(Date.now());
        recordFilters.value!.startEpoch = setDateToTheLastDateOfPreviousYear(Date.now());
      } else if (newPreset === "current-month") {
        recordFilters.value!.startEpoch = setDateToTheFirstDateOfMonth(Date.now());
        recordFilters.value!.endEpoch = Date.now();
      } else if (newPreset === "previous-month") {
        recordFilters.value!.startEpoch = setDateToTheFirstDateOfPreviousMonth(Date.now());
        recordFilters.value!.endEpoch = setDateToTheLastDateOfPreviousMonth(Date.now());
      } else if (newPreset === "all-time") {
        recordFilters.value!.startEpoch = 0;
        recordFilters.value!.endEpoch = Date.now();
      }
    }

    watch(selectedPreset, async (newPreset: any) => {
      applyPreset(newPreset);
    });

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      partyTypeList,
      validators,
      recordFilters,
      filterPresetList,
      selectedPreset,
      startEpochChanged,
      endEpochChanged,
    };
  },
};
</script>
<style scoped lang="ts"></style>
