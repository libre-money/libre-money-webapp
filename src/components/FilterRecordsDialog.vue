<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section v-if="recordFilters">
        <div class="std-dialog-title" style="padding-bottom: 8px">Filters</div>
        <q-select filled v-model="selectedPreset" :options="dateRangePresetList" label="Preset" emit-value map-options />
        <div class="row no-wrap" style="margin-top: 8px">
          <date-input v-model="recordFilters.startEpoch" label="Start Date" @update:model-value="startEpochChanged"></date-input>
          <date-input v-model="recordFilters.endEpoch" label="End Date" @update:model-value="endEpochChanged" style="margin-left: 4px"></date-input>
        </div>
        <br />
        <div class="row no-wrap" style="margin-top: -12px">
          <div class="col col-5" style="margin-right: 4px">
            <select-currency v-model="recordFilters.currencyId" :mandatory="false" :shorthand="true"></select-currency>
          </div>
          <div class="col">
            <select-wallet v-model="recordFilters.walletId" :limit-by-currency-id="recordFilters.currencyId"></select-wallet>
          </div>
        </div>
        <div style="margin-top: -20px">
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
          <q-input filled v-model="recordFilters.searchString" label="Search in notes" />
        </div>

        <!-- More Options Section -->
        <div style="margin-top: 16px">
          <div
            class="row items-center cursor-pointer"
            @click="moreOptionsExpanded = !moreOptionsExpanded"
            style="padding: 8px 0; border-top: 1px solid rgba(0, 0, 0, 0.12)"
          >
            <div class="text-subtitle2 text-grey-7">More Options</div>
            <q-space />
            <q-icon :name="moreOptionsExpanded ? 'expand_less' : 'expand_more'" class="text-grey-6" />
          </div>

          <div v-show="moreOptionsExpanded">
            <div style="margin-top: 12px">
              <q-input filled v-model="recordFilters.deepSearchString" label="Deep search (advanced)" />
            </div>
            <div style="margin-top: 12px; margin-bottom: 12px">
              <q-select filled v-model="recordFilters.sortBy" :options="sortByTypeList" label="Sort by" emit-value map-options />
            </div>
            <div style="margin-top: 12px; margin-bottom: 12px">
              <q-checkbox v-model="recordFilters.highlightDuplicates" label="Highlight possible duplicates" />
            </div>
          </div>
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

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar";
import DateInput from "src/components/lib/DateInput.vue";
import { dateRangePresetList, sortByTypeList } from "src/constants/constants";
import { RecordFilters } from "src/models/inferred/record-filters";
import { getStartAndEndEpochFromPreset } from "src/utils/date-range-preset-utils";
import { Ref, ref, watch } from "vue";
import SelectParty from "./SelectParty.vue";
import SelectRecordType from "./SelectRecordType.vue";
import SelectTag from "./SelectTag.vue";
import SelectWallet from "./SelectWallet.vue";
import SelectCurrency from "./SelectCurrency.vue";

// Props
const props = defineProps<{
  inputFilters?: RecordFilters | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const isLoading = ref(false);
const moreOptionsExpanded = ref(false);

const recordFilters: Ref<RecordFilters | null> = ref(null);

const defaultPreset = props.inputFilters?._preset || "current-year";
const selectedPreset: Ref<string> = ref(defaultPreset);

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
    sortBy: "transactionEpochDesc",
    highlightDuplicates: false,
    type: "standard",
    currencyId: null,
  };
}
isLoading.value = false;

async function okClicked() {
  recordFilters.value!.type = "standard";
  recordFilters.value!._preset = selectedPreset.value;
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

watch(selectedPreset, (newPreset: any) => {
  applyPreset(newPreset);
});

// Watch for currency changes and clear wallet selection if needed
watch(
  () => recordFilters.value?.currencyId,
  (newCurrencyId, oldCurrencyId) => {
    if (newCurrencyId !== oldCurrencyId && recordFilters.value?.walletId) {
      // Clear wallet selection when currency changes since wallet options will be filtered
      recordFilters.value.walletId = null;
    }
  }
);

applyPreset(selectedPreset.value!);

const cancelClicked = onDialogCancel;
</script>
<style scoped lang="scss"></style>
