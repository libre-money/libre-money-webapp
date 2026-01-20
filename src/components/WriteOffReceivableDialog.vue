<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink">
        <div class="std-dialog-title text-warning text-weight-bold">⚠️ Write Off Receivable</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="col scroll" style="min-height: 0">
        <q-form class="q-gutter-md q-pa-md1" ref="writeOffForm">
          <q-banner class="bg-warning text-dark">
            <template v-slot:avatar>
              <q-icon name="warning" color="dark" />
            </template>
            You are about to write off an uncollectable receivable. This will close the unpaid amount and recognize it as a bad debt. This action cannot be undone.
          </q-banner>

          <div class="dialog-card">
            <div><span class="key">Party:</span> <span class="value">{{ receivableItem.partyName }}</span></div>
            <div><span class="key">Type:</span> <span class="value">{{ receivableItem.type === 'income' ? 'Income' : 'Asset Sale' }}</span></div>
            <div><span class="key">Description:</span> <span class="value">{{ receivableItem.description }}</span></div>
            <div><span class="key">Original Amount:</span> <span class="value">{{ printAmount(receivableItem.originalAmount) }}</span></div>
            <div><span class="key">Already Received:</span> <span class="value">{{ printAmount(receivableItem.amountReceived) }}</span></div>
            <div><span class="key">Remaining:</span> <span class="value">{{ printAmount(receivableItem.amountUnpaid) }}</span></div>
          </div>

          <date-time-input v-model="transactionEpoch" label="Write-off Date & Time"></date-time-input>

          <q-input
            type="number"
            standout="bg-primary text-white"
            v-model.number="amountToWriteOff"
            label="Amount to Write Off"
            lazy-rules
            :rules="[
              (val: number | null | undefined) => (val !== null && val !== undefined && val > 0) || 'Amount must be greater than 0',
              (val: number) => val <= receivableItem.amountUnpaid || `Cannot exceed remaining amount (${printAmount(receivableItem.amountUnpaid)})`,
            ]"
          >
            <template v-slot:append>
              <div class="currency-label">{{ receivableItem.currencySign }}</div>
            </template>
          </q-input>

          <div class="row q-gutter-sm">
            <q-btn flat label="Write Off Half" @click="amountToWriteOff = Math.floor(receivableItem.amountUnpaid / 2)" />
            <q-btn flat label="Write Off All" @click="amountToWriteOff = receivableItem.amountUnpaid" />
          </div>

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

          <q-banner class="bg-orange-2 text-dark">
            <template v-slot:avatar>
              <q-icon name="info" color="dark" />
            </template>
            This will reduce your asset (receivable) and create a Bad Debt Expense entry. This action cannot be undone.
          </q-banner>
        </q-form>
      </q-card-section>
      <q-separator />
      <q-card-section class="no-shrink">
        <div class="flex">
          <q-btn flat rounded label="Cancel" @click="onDialogCancel" />
          <div class="spacer"></div>
          <q-btn rounded color="warning" label="Write Off" @click="okClicked" />
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
import { ReceivableItem } from "src/models/inferred/receivable-item";
import { pouchdbService } from "src/services/pouchdb-service";
import SelectTag from "./SelectTag.vue";
import { asAmount, printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import DateTimeInput from "./lib/DateTimeInput.vue";

const props = defineProps<{
  receivableItem: ReceivableItem;
}>();

const emit = defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const $q = useQuasar();

const writeOffForm = ref<QForm | null>(null);
const amountToWriteOff = ref<number>(props.receivableItem.amountUnpaid);
const reason = ref<string>("uncollectable");
const tagIdList = ref<string[]>([]);
const notes = ref<string | null>(null);
const transactionEpoch = ref<number>(Date.now());

const reasonOptions = [
  { label: "Uncollectable (bad debt)", value: "uncollectable" },
  { label: "Customer bankruptcy", value: "bankruptcy" },
  { label: "Disputed amount", value: "disputed" },
  { label: "Waived as goodwill", value: "waived" },
  { label: "Other", value: "other" },
];

function printAmount(amount: number) {
  return printAmountUtil(amount, props.receivableItem.currencyId);
}

async function okClicked() {
  if (!(await writeOffForm.value?.validate())) {
    return;
  }

  // Confirmation dialog
  const confirmed = await new Promise((resolve) => {
    $q.dialog({
      title: "⚠️ Confirm Write-Off",
      message: `You are about to write off ${printAmount(amountToWriteOff.value)} from ${props.receivableItem.partyName}. This will be recorded as bad debt. This action cannot be undone.`,
      cancel: true,
      persistent: true,
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false));
  });

  if (!confirmed) {
    return;
  }

  // Create a RECEIVABLE_RECEIPT record with amount = amountToWriteOff but walletId = null
  // This indicates it's a write-off, not an actual receipt
  const record: Record = {
    $collection: Collection.RECORD,
    notes: notes.value || `Write-off: ${reason.value}`,
    type: RecordType.RECEIVABLE_RECEIPT,
    tagIdList: tagIdList.value,
    transactionEpoch: transactionEpoch.value,
    receivableReceipt: {
      originalRecordId: props.receivableItem.recordId,
      originalRecordType: props.receivableItem.type,
      partyId: props.receivableItem.partyId,
      walletId: "write-off", // Special marker for write-offs
      amount: asAmount(amountToWriteOff.value),
      currencyId: props.receivableItem.currencyId,
    },
  };

  await pouchdbService.upsertDoc(record);

  $q.notify({
    type: "positive",
    message: "Receivable written off successfully",
  });

  onDialogOK();
}
</script>

<style scoped lang="scss"></style>
