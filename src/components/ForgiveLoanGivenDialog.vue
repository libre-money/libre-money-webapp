<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink">
        <div class="std-dialog-title text-warning text-weight-bold">⚠️ Forgive Loan</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="col scroll" style="min-height: 0">
        <q-form class="q-gutter-md q-pa-md1" ref="forgivenessForm">
          <q-banner class="bg-warning text-dark">
            <template v-slot:avatar>
              <q-icon name="warning" color="dark" />
            </template>
            You are about to forgive a loan. This action will reduce the outstanding balance and create a Bad Debt Expense or Gift entry.
          </q-banner>

          <div class="dialog-card">
            <div><span class="key">Party (Borrower):</span> <span class="value">{{ loanGivenItem.partyName }}</span></div>
            <div><span class="key">Amount Lent:</span> <span class="value">{{ printAmount(loanGivenItem.amountLent) }}</span></div>
            <div><span class="key">Repaid So Far:</span> <span class="value">{{ printAmount(loanGivenItem.amountRepaid) }}</span></div>
            <div><span class="key">Outstanding Balance:</span> <span class="value">{{ printAmount(loanGivenItem.amountOutstanding) }}</span></div>
          </div>

          <date-time-input v-model="transactionEpoch" label="Forgiveness Date & Time"></date-time-input>

          <q-input
            type="number"
            standout="bg-primary text-white"
            v-model.number="amountToForgive"
            label="Amount to Forgive"
            lazy-rules
            :rules="[
              (val: number | null | undefined) => (val !== null && val !== undefined && val > 0) || 'Amount must be greater than 0',
              (val: number) => val <= loanGivenItem.amountOutstanding || `Cannot exceed outstanding amount (${printAmount(loanGivenItem.amountOutstanding)})`,
            ]"
          >
            <template v-slot:append>
              <div class="currency-label">{{ loanGivenItem.currencySign }}</div>
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
          <q-btn rounded color="warning" label="Forgive Loan" @click="okClicked" />
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
import { LoanGivenItem } from "src/models/inferred/loan-given-item";
import { pouchdbService } from "src/services/pouchdb-service";
import SelectTag from "./SelectTag.vue";
import { asAmount, printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import DateTimeInput from "./lib/DateTimeInput.vue";

const props = defineProps<{
  loanGivenItem: LoanGivenItem;
}>();

const emit = defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const $q = useQuasar();

const forgivenessForm = ref<QForm | null>(null);
const amountToForgive = ref<number>(props.loanGivenItem.amountOutstanding);
const reason = ref<string>("uncollectable");
const tagIdList = ref<string[]>([]);
const notes = ref<string | null>(null);
const transactionEpoch = ref<number>(Date.now());

const reasonOptions = [
  { label: "Uncollectable", value: "uncollectable" },
  { label: "Gift", value: "gift" },
  { label: "Settlement", value: "settlement" },
  { label: "Other", value: "other" },
];

function printAmount(amount: number) {
  return printAmountUtil(amount, props.loanGivenItem.currencyId);
}

async function okClicked() {
  if (!(await forgivenessForm.value?.validate())) {
    return;
  }

  // Confirmation dialog
  const confirmed = await new Promise((resolve) => {
    $q.dialog({
      title: "⚠️ Confirm Loan Forgiveness",
      message: `You are about to forgive ${printAmount(amountToForgive.value)} owed by ${props.loanGivenItem.partyName}. This action cannot be undone.`,
      cancel: true,
      persistent: true,
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false));
  });

  if (!confirmed) {
    return;
  }

  const record: Record = {
    $collection: Collection.RECORD,
    notes: notes.value || "",
    type: RecordType.LOAN_FORGIVENESS_GIVEN,
    tagIdList: tagIdList.value,
    transactionEpoch: transactionEpoch.value,
    loanForgivenessGiven: {
      originalLendingRecordId: props.loanGivenItem.lendingRecordId,
      partyId: props.loanGivenItem.partyId,
      amountForgiven: asAmount(amountToForgive.value),
      currencyId: props.loanGivenItem.currencyId,
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
