<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin">
      <q-card-section v-if="recordSummary">
        <div class="std-dialog-title q-pa-md">Loan and Debt Summary</div>
        <div class="dialog-card">
          <div>
            <span class="key">Party:</span>
            <span class="value">{{ recordSummary.partyName }}</span>
          </div>
          <div>
            <span class="key">Total loans given by you:</span>
            <span class="value">{{ printAmount(recordSummary.totalLoansGivenToParty) }}</span>
          </div>
          <div>
            <span class="key">Total loans taken by you:</span>
            <span class="value">{{ printAmount(recordSummary.totalLoansTakenFromParty) }}</span>
          </div>
          <div>
            <span class="key">Total repaid by you:</span>
            <span class="value">{{ printAmount(recordSummary.totalRepaidToParty) }}</span>
          </div>
          <div>
            <span class="key">Total repaid to you:</span>
            <span class="value">{{ printAmount(recordSummary.totalRepaidByParty) }}</span>
          </div>
          <div>
            <span class="key">You owe them:</span>
            <span class="value">{{ printAmount(recordSummary.totalOwedToParty) }}</span>
          </div>
          <div>
            <span class="key">They owe you:</span>
            <span class="value">{{ printAmount(recordSummary.totalOwedByParty) }}</span>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Close" @click="cancelClicked" />
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
import { LoanAndDebtSummary } from "src/models/inferred/loan-and-debt-summary";
import { asAmount, prettifyAmount } from "src/utils/misc-utils";

export default {
  props: {
    summary: {
      type: Object,
      required: false,
      default: null,
    },
  },

  components: {},

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const isLoading = ref(false);

    const recordSummary: Ref<LoanAndDebtSummary | null> = ref(null);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    isLoading.value = true;
    if (props.summary) {
      recordSummary.value = props.summary as LoanAndDebtSummary;
    }
    isLoading.value = false;

    async function okClicked() {
      onDialogOK();
    }

    function printAmount(amount: number) {
      return `${recordSummary.value?.currencySign} ${prettifyAmount(amount)}`;
    }

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      partyTypeList,
      validators,
      recordSummary,
      printAmount,
    };
  },
};
</script>
<style scoped lang="scss">
.key {
  margin-right: 8px;
}

.dialog-card {
  margin-left: 16px;
}
</style>
