<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink">
        <div class="std-dialog-title text-primary text-weight-bold">Pay Payable</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="col scroll" style="min-height: 0">
        <q-form class="q-gutter-md q-pa-md1" ref="paymentForm">
          <div class="dialog-card">
            <div><span class="key">Party/Vendor:</span> <span class="value">{{ payableItem.partyName }}</span></div>
            <div><span class="key">Type:</span> <span class="value">{{ payableItem.type === 'expense' ? 'Expense' : 'Asset Purchase' }}</span></div>
            <div><span class="key">Description:</span> <span class="value">{{ payableItem.description }}</span></div>
            <div><span class="key">Original Amount:</span> <span class="value">{{ printAmount(payableItem.originalAmount) }}</span></div>
            <div><span class="key">Already Paid:</span> <span class="value">{{ printAmount(payableItem.amountPaid) }}</span></div>
            <div><span class="key">Remaining:</span> <span class="value">{{ printAmount(payableItem.amountUnpaid) }}</span></div>
          </div>

          <date-time-input v-model="transactionEpoch" label="Payment Date & Time"></date-time-input>

          <q-input
            type="number"
            standout="bg-primary text-white"
            v-model.number="paymentAmount"
            label="Payment Amount"
            lazy-rules
            :rules="[
              (val: number | null | undefined) => (val !== null && val !== undefined && val > 0) || 'Amount must be greater than 0',
              (val: number) => val <= payableItem.amountUnpaid || `Cannot exceed remaining amount (${printAmount(payableItem.amountUnpaid)})`,
            ]"
          >
            <template v-slot:append>
              <div class="currency-label">{{ payableItem.currencySign }}</div>
            </template>
          </q-input>

          <div class="row q-gutter-sm">
            <q-btn flat label="Pay Partial" @click="paymentAmount = Math.floor(payableItem.amountUnpaid / 2)" />
            <q-btn flat label="Pay All" @click="paymentAmount = payableItem.amountUnpaid" />
          </div>

          <select-wallet v-model="walletId" :limitByCurrencyId="payableItem.currencyId"></select-wallet>
          <div class="wallet-balance-container" v-if="selectedWallet">
            <div>Balance in wallet: {{ printAmount(selectedWallet._balance!) }}</div>
            <div style="margin-top: 8px">Balance afterwards will be: {{ printAmount(selectedWallet.potentialBalance) }}</div>
            <div class="wallet-limit" style="margin-top: 8px" v-if="selectedWallet._minimumBalanceState !== 'not-set'">
              <span class="wallet-limit-warning" v-if="selectedWallet._minimumBalanceState === 'warning'">
                Approaching limit {{ printAmount(selectedWallet.minimumBalance!) }}
              </span>
              <span class="wallet-limit-exceeded" v-else-if="selectedWallet._minimumBalanceState === 'exceeded'">
                Exceeded limit {{ printAmount(selectedWallet.minimumBalance!) }}
              </span>
              <span class="wallet-limit-normal" v-else-if="selectedWallet._minimumBalanceState === 'normal'">
                Limit {{ printAmount(selectedWallet.minimumBalance!) }}
              </span>
            </div>
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
          <q-btn rounded color="primary" label="Record Payment" @click="okClicked" />
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
import { PayableItem } from "src/models/inferred/payable-item";
import { computationService } from "src/services/computation-service";
import { pouchdbService } from "src/services/pouchdb-service";
import SelectWallet from "./SelectWallet.vue";
import SelectTag from "./SelectTag.vue";
import { asAmount, printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import DateTimeInput from "./lib/DateTimeInput.vue";

const props = defineProps<{
  payableItem: PayableItem;
}>();

const emit = defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const $q = useQuasar();

const paymentForm = ref<QForm | null>(null);
const paymentAmount = ref<number>(props.payableItem.amountUnpaid);
const walletId = ref<string | null>(null);
const tagIdList = ref<string[]>([]);
const notes = ref<string | null>(null);
const selectedWallet = ref<WalletWithPotentialBalance | null>(null);
const transactionEpoch = ref<number>(Date.now());

function printAmount(amount: number) {
  return printAmountUtil(amount, props.payableItem.currencyId);
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

  wallet.potentialBalance = wallet._balance! - asAmount(paymentAmount.value);
  selectedWallet.value = wallet;
});

watch(paymentAmount, (newAmount) => {
  if (selectedWallet.value) {
    selectedWallet.value.potentialBalance = selectedWallet.value._balance! - asAmount(newAmount);
  }
});

async function okClicked() {
  if (!(await paymentForm.value?.validate())) {
    return;
  }

  if (!walletId.value) {
    $q.notify({ type: "negative", message: "Please select a wallet" });
    return;
  }

  const record: Record = {
    $collection: Collection.RECORD,
    notes: notes.value || "",
    type: RecordType.PAYABLE_PAYMENT,
    tagIdList: tagIdList.value,
    transactionEpoch: transactionEpoch.value,
    payablePayment: {
      originalRecordId: props.payableItem.recordId,
      originalRecordType: props.payableItem.type,
      partyId: props.payableItem.partyId,
      walletId: walletId.value,
      amount: asAmount(paymentAmount.value),
      currencyId: props.payableItem.currencyId,
    },
  };

  await pouchdbService.upsertDoc(record);

  $q.notify({
    type: "positive",
    message: "Payment recorded successfully",
  });

  onDialogOK();
}
</script>

<style scoped lang="scss"></style>
