<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin">
      <q-card-section v-if="recordFilters">
        <div class="std-dialog-title q-pa-md">Record Filters</div>
        <date-input v-model="recordFilters.startEpoch" label="Start Date"></date-input>
        <br />
        <date-input v-model="recordFilters.endEpoch" label="End Date"></date-input>
        <br />
        <select-record-type v-model="recordFilters.recordTypeList" />
        <div style="margin-top: -12px">
          <select-party v-model="recordFilters.partyId" :mandatory="false"></select-party>
        </div>
        <div style="margin-top: -12px">
          <select-tag v-model="recordFilters.tagList"></select-tag>
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
import { Ref, ref } from "vue";
import { validators } from "src/utils/validators";
import { Collection, defaultPartyType, partyTypeList } from "src/constants/constants";
import { Party } from "src/models/party";
import { pouchdbService } from "src/services/pouchdb-service";
import { RecordFilters } from "src/models/inferred/record-filters";
import DateInput from "src/components/lib/DateInput.vue";
import SelectRecordType from "./SelectRecordType.vue";
import { setDateToTheFirstDateOfMonth } from "src/utils/date-utils";
import SelectParty from "./SelectParty.vue";
import SelectTag from "./SelectTag.vue";

export default {
  props: {
    inputFilters: {
      type: Object,
      required: false,
      default: null,
    },
  },

  components: { DateInput, SelectRecordType, SelectParty, SelectTag },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const isLoading = ref(false);

    const recordFilters: Ref<RecordFilters | null> = ref(null);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    isLoading.value = true;
    if (props.inputFilters) {
      recordFilters.value = props.inputFilters as RecordFilters;
    } else {
      recordFilters.value = {
        startEpoch: setDateToTheFirstDateOfMonth(Date.now()),
        endEpoch: Date.now(),
        recordTypeList: [],
        tagList: [],
        partyId: null,
      };
    }
    isLoading.value = false;

    async function okClicked() {
      onDialogOK(recordFilters.value);
    }

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      partyTypeList,
      validators,
      recordFilters,
    };
  },
};
</script>
<style scoped lang="ts"></style>
