<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink">
        <div class="std-dialog-title text-positive text-weight-bold">✨ Mark Loan as Forgiven</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="col scroll" style="min-height: 0">
        <q-form class="q-gutter-md q-pa-md1" ref="forgivenessForm">
          <q-banner class="bg-positive text-white">
            <template v-slot:avatar>
              <q-icon name="celebration" color="white" />
            </template>
            The lender has forgiven your debt. This will reduce the outstanding balance and record it as Debt Forgiveness Income or Gift Received.
          </q-banner>

          <div class="dialog-card">
            <div><span class="key">Party/Lender:</span> <span class="value">{{ loanTakenItem.partyName }}</span></div>
            <div><span class="key">Amount Borrowed:</span> <span class="value">{{ printAmount(loanTakenItem.amountBorrowed) }}</span></div>
            <div><span class="key">Repaid So Far:</span> <span class="value">{{ printAmount(loanTakenItem.amountRepaid) }}</span></div>
            <div><span class="key">Outstanding Balance:</span> <span class="value">{{ printAmount(loanTakenItem.amountOutstanding) }}</span></div>
          </div>

          <date-time-input v-model="transactionEpoch" label="Forgiveness Date & Time"></date-time-input>

          <q-input
            type="number"
            standout="bg-primary text-white"
            v-model.number="amountForgiven"
            label="Amount Forgiven"
            lazy-rules
            :rules="[
              (val: number | null | undefined) => (val !== null && val !== undefined && val > 0) || 'Amount must be greater than 0',
              (val: number) => val <= loanTakenItem.amountOutstanding || `Cannot exceed outstanding amount (${printAmount(loanTakenItem.amountOutstanding)})`,
            ]"
          >
            <template v-slot:append>
              <div class="currency-label">{{ loanTakenItem.currencySign }}</div>
            </template>
          </q-input>


          <q-select
            v-model="reason"
            :options="reasonOptions"
            label="Reason"
            standout="bg-primary text-white"
            emit-value
            map-options
          />

          <select-tag v-model="tagIdList"></select-tag>
          <q-input type="textarea" standout="bg-primary text-white" v-model="notes" label="Notes" />
        </q-form>
      </q-card-section>
      <q-separator />
      <q-card-section class="no-shrink">
        <div class="flex">
          <q-btn flat rounded label="Cancel" @click="onDialogCancel" />
          <div class="spacer"></div>
          <q-btn rounded color="positive" label="Mark as Forgiven" @click="okClicked" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent, useQuasar } from "quasar";
import { ref } from "vue";
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/schemas/record";
import { LoanTakenItem } from "src/models/inferred/loan-taken-item";
import { pouchdbService } from "src/services/pouchdb-service";
import SelectTag from "./SelectTag.vue";
import { asAmount, printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import DateTimeInput from "./lib/DateTimeInput.vue";

const props = defineProps<{
  loanTakenItem: LoanTakenItem;
}>();

const emit = defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const $q = useQuasar();

const forgivenessForm = ref<QForm | null>(null);
const amountForgiven = ref<number>(props.loanTakenItem.amountOutstanding);
const reason = ref<string>("gift");
const tagIdList = ref<string[]>([]);
const notes = ref<string | null>(null);
const transactionEpoch = ref<number>(Date.now());

const reasonOptions = [
  { label: "Gift (from lender)", value: "gift" },
  { label: "Settlement Agreement", value: "settlement" },
  { label: "Uncollectable (lender wrote off)", value: "uncollectable" },
  { label: "Other", value: "other" },
];

function printAmount(amount: number) {
  return printAmountUtil(amount, props.loanTakenItem.currencyId);
}

async function okClicked() {
  if (!(await forgivenessForm.value?.validate())) {
    return;
  }

  const record: Record = {
    $collection: Collection.RECORD,
    notes: notes.value || "",
    type: RecordType.LOAN_FORGIVENESS_RECEIVED,
    tagIdList: tagIdList.value,
    transactionEpoch: transactionEpoch.value,
    loanForgivenessReceived: {
      originalBorrowingRecordId: props.loanTakenItem.borrowingRecordId,
      partyId: props.loanTakenItem.partyId,
      amountForgiven: asAmount(amountForgiven.value),
      currencyId: props.loanTakenItem.currencyId,
      reason: reason.value as "uncollectable" | "gift" | "settlement" | "other",
    },
  };

  await pouchdbService.upsertDoc(record);

  $q.notify({
    type: "positive",
    message: "Loan forgiveness recorded successfully",
  });

  onDialogOK();
}
</script>

<style scoped lang="scss"></style>
