<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink">
        <div class="std-dialog-title text-primary text-weight-bold">Record Receipt</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="col scroll" style="min-height: 0">
        <q-form class="q-gutter-md q-pa-md1" ref="receiptForm">
          <div class="dialog-card">
            <div><span class="key">Party:</span> <span class="value">{{ receivableItem.partyName }}</span></div>
            <div><span class="key">Type:</span> <span class="value">{{ receivableItem.type === 'income' ? 'Income' : 'Asset Sale' }}</span></div>
            <div><span class="key">Description:</span> <span class="value">{{ receivableItem.description }}</span></div>
            <div><span class="key">Original Amount:</span> <span class="value">{{ printAmount(receivableItem.originalAmount) }}</span></div>
            <div><span class="key">Already Received:</span> <span class="value">{{ printAmount(receivableItem.amountReceived) }}</span></div>
            <div><span class="key">Remaining:</span> <span class="value">{{ printAmount(receivableItem.amountUnpaid) }}</span></div>
          </div>

          <date-time-input v-model="transactionEpoch" label="Receipt Date & Time"></date-time-input>

          <q-input
            type="number"
            standout="bg-primary text-white"
            v-model.number="receiptAmount"
            label="Receipt Amount"
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
            <q-btn flat label="Receive Partial" @click="receiptAmount = Math.floor(receivableItem.amountUnpaid / 2)" />
            <q-btn flat label="Receive All" @click="receiptAmount = receivableItem.amountUnpaid" />
          </div>

          <select-wallet v-model="walletId" :limitByCurrencyId="receivableItem.currencyId"></select-wallet>
          <div class="wallet-balance-container" v-if="selectedWallet">
            <div>Balance in wallet: {{ printAmount(selectedWallet._balance!) }}</div>
            <div style="margin-top: 8px">Balance afterwards will be: {{ printAmount(selectedWallet.potentialBalance) }}</div>
          </div>

          <select-tag v-model="tagIdList"></select-tag>
          <q-input type="textarea" standout="bg-primary text-white" v-model="notes" label="Notes" />
        </q-form>
      </q-card-section>
      <q-separator />
      <q-card-section class="no-shrink">
        <div class="flex">
          <q-btn flat rounded label="Cancel" @click="onDialogCancel" />
          <div class="spacer"></div>
          <q-btn rounded color="positive" label="Record Receipt" @click="okClicked" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent, useQuasar } from "quasar";
import { ref, watch } from "vue";
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/schemas/record";
import { WalletWithPotentialBalance } from "src/schemas/wallet";
import { ReceivableItem } from "src/models/inferred/receivable-item";
import { computationService } from "src/services/computation-service";
import { pouchdbService } from "src/services/pouchdb-service";
import SelectWallet from "./SelectWallet.vue";
import SelectTag from "./SelectTag.vue";
import { asAmount, printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import DateTimeInput from "./lib/DateTimeInput.vue";

const props = defineProps<{
  receivableItem: ReceivableItem;
}>();

const emit = defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const $q = useQuasar();

const receiptForm = ref<QForm | null>(null);
const receiptAmount = ref<number>(props.receivableItem.amountUnpaid);
const walletId = ref<string | null>(null);
const tagIdList = ref<string[]>([]);
const notes = ref<string | null>(null);
const selectedWallet = ref<WalletWithPotentialBalance | null>(null);
const transactionEpoch = ref<number>(Date.now());

function printAmount(amount: number) {
  return printAmountUtil(amount, props.receivableItem.currencyId);
}

watch(walletId, async (newWalletId) => {
  if (!newWalletId) {
    selectedWallet.value = null;
    return;
  }

  const res = await pouchdbService.listByCollection(Collection.WALLET);
  const walletList = res.docs as WalletWithPotentialBalance[];

  await computationService.computeBalancesForWallets(walletList);

  const wallet = walletList.find((w) => w._id === newWalletId);
  if (!wallet) {
    selectedWallet.value = null;
    return;
  }

  wallet.potentialBalance = wallet._balance! + asAmount(receiptAmount.value);
  selectedWallet.value = wallet;
});

watch(receiptAmount, (newAmount) => {
  if (selectedWallet.value) {
    selectedWallet.value.potentialBalance = selectedWallet.value._balance! + asAmount(newAmount);
  }
});

async function okClicked() {
  if (!(await receiptForm.value?.validate())) {
    return;
  }

  if (!walletId.value) {
    $q.notify({ type: "negative", message: "Please select a wallet" });
    return;
  }

  const record: Record = {
    $collection: Collection.RECORD,
    notes: notes.value || "",
    type: RecordType.RECEIVABLE_RECEIPT,
    tagIdList: tagIdList.value,
    transactionEpoch: transactionEpoch.value,
    receivableReceipt: {
      originalRecordId: props.receivableItem.recordId,
      originalRecordType: props.receivableItem.type,
      partyId: props.receivableItem.partyId,
      walletId: walletId.value,
      amount: asAmount(receiptAmount.value),
      currencyId: props.receivableItem.currencyId,
    },
  };

  await pouchdbService.upsertDoc(record);

  $q.notify({
    type: "positive",
    message: "Receipt recorded successfully",
  });

  onDialogOK();
}
</script>

<style scoped lang="scss"></style>
