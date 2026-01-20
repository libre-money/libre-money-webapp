<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing an Asset Sale Record" : "Adding an Asset Sale Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-asset v-model="recordAssetId"></select-asset>
          <q-input type="number" standout="bg-primary text-white" v-model="recordAmount" label="Price of the Asset"
            lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">
                {{ recordCurrencySign }}
              </div>
            </template>
          </q-input>

          <q-tabs v-model="paymentType" inline-label class="bg-grey text-white shadow-2 std-margin-bottom-32">
            <q-tab name="full" label="Paid" />
            <q-tab name="partial" label="Partially Paid" />
            <q-tab name="unpaid" label="Unpaid" />
          </q-tabs>

          <select-wallet v-model="recordWalletId" :limitByCurrencyId="recordCurrencyId"
            v-if="paymentType == 'full' || paymentType == 'partial'"></select-wallet>
          <div class="wallet-balance-container"
            v-if="(paymentType == 'full' || paymentType == 'partial') && selectedWallet">
            <div>Balance in wallet: {{ printAmount(selectedWallet._balance!) }}</div>
            <div style="margin-top: 8px">Balance afterwards will be: {{ printAmount(selectedWallet.potentialBalance) }}
            </div>
          </div>
          <q-input type="number" standout="bg-primary text-white" v-model="recordAmountPaid" label="Amount Paid"
            lazy-rules :rules="validators.balance" v-if="paymentType == 'partial'" />
          <div v-if="paymentType == 'partial'">Amount remaining: {{ recordAmountUnpaid }}</div>

          <select-party v-model="recordPartyId"
            :mandatory="paymentType == 'unpaid' || paymentType == 'partial'"></select-party>
          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input type="textarea" standout="bg-primary text-white" v-model="recordNotes" label="Notes" lazy-rules
            :rules="validators.notes" />
          <date-time-input v-model="transactionEpoch" label="Date & Time"></date-time-input>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <q-btn color="primary" label="OK" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/schemas/record";
import { WalletWithPotentialBalance } from "src/schemas/wallet";
import { computationService } from "src/services/computation-service";
import { dialogService } from "src/services/dialog-service";
import { entityService } from "src/services/entity-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { asAmount, printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import { isNullOrUndefined } from "src/utils/misc-utils";
import { validators } from "src/utils/validators";
import { onMounted, ref, watch } from "vue";
import DateTimeInput from "./lib/DateTimeInput.vue";
import SelectAsset from "./SelectAsset.vue";
import SelectParty from "./SelectParty.vue";
import SelectTag from "./SelectTag.vue";
import SelectWallet from "./SelectWallet.vue";

// Props
const props = defineProps<{
  existingRecordId?: string | null;
  existingAssetId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// State
let initialDoc: Record | null = null;
const isLoading = ref(false);

const recordForm = ref<QForm | null>(null);

const paymentType = ref<string>("full");
const recordType = RecordType.ASSET_SALE;

const recordCurrencySign = ref<string | null>(null);
const recordAssetId = ref<string | null>(null);
const recordAmount = ref<number>(0);
const recordCurrencyId = ref<string | null>(null);
const recordPartyId = ref<string | null>(null);
const recordWalletId = ref<string | null>(null);
const recordAmountPaid = ref<number>(0);
const recordAmountUnpaid = ref<number>(0);
const recordTagIdList = ref<string[]>([]);
const recordNotes = ref<string | null>(null);

const selectedWallet = ref<WalletWithPotentialBalance | null>(null);

const transactionEpoch = ref<number>(Date.now());

// Load existing record if editing
onMounted(() => {
  if (props.existingRecordId) {
    isLoading.value = true;
    (async function () {
      isLoading.value = true;
      let res = (await pouchdbService.getDocById(props.existingRecordId!)) as Record;
      initialDoc = res;
      if (!initialDoc.assetSale) {
        // TODO show error message
        isLoading.value = false;
        return;
      }

      recordAssetId.value = initialDoc.assetSale.assetId;
      recordAmount.value = asAmount(initialDoc.assetSale.amount);

      recordCurrencyId.value = initialDoc.assetSale.currencyId;
      recordPartyId.value = initialDoc.assetSale.partyId;
      recordWalletId.value = initialDoc.assetSale.walletId;
      recordAmountPaid.value = initialDoc.assetSale.amountPaid;
      recordAmountUnpaid.value = initialDoc.assetSale.amountUnpaid;
      recordTagIdList.value = initialDoc.tagIdList;
      recordNotes.value = initialDoc.notes;

      if (initialDoc.assetSale.amount === initialDoc.assetSale.amountPaid) {
        paymentType.value = "full";
      } else if (initialDoc.assetSale.amountPaid === 0) {
        paymentType.value = "unpaid";
      } else {
        paymentType.value = "partial";
      }

      transactionEpoch.value = initialDoc.transactionEpoch || Date.now();

      isLoading.value = false;
    })();
  } else {
    if (props.existingAssetId) {
      setTimeout(() => {
        recordAssetId.value = props.existingAssetId!;
      }, 10);
    }
  }
});

// Manual validation
async function performManualValidation() {
  if (paymentType.value === "full" || paymentType.value === "partial") {
    if (!recordWalletId.value) {
      await dialogService.alert("Error", "For fully or partially paid asset sales, Wallet is required.");
      return false;
    }
  }

  if (paymentType.value === "partial" || paymentType.value === "unpaid") {
    if (!recordPartyId.value) {
      await dialogService.alert("Error", "For partially paid and unpaid asset sales, Party is required.");
      return false;
    }
  }

  if (paymentType.value === "unpaid") {
    recordWalletId.value = null;
  }

  if (paymentType.value === "full") {
    recordAmountPaid.value = recordAmount.value;
    recordAmountUnpaid.value = 0;
  }

  recordAmountPaid.value = Math.min(recordAmountPaid.value, recordAmount.value);

  recordAmountUnpaid.value = recordAmount.value - recordAmountPaid.value;

  return true;
}

// OK click handler
async function okClicked() {
  if (!(await recordForm.value?.validate())) {
    return;
  }

  if (!(await performManualValidation())) {
    return;
  }

  let record: Record = {
    $collection: Collection.RECORD,
    notes: recordNotes.value!,
    type: recordType,
    tagIdList: recordTagIdList.value,
    transactionEpoch: transactionEpoch.value,
    assetSale: {
      assetId: recordAssetId.value!,
      amount: asAmount(recordAmount.value),
      currencyId: recordCurrencyId.value!,
      partyId: recordPartyId.value,
      walletId: recordWalletId.value!,
      amountPaid: asAmount(recordAmountPaid.value),
      amountUnpaid: asAmount(recordAmountUnpaid.value),
    },
  };

  if (initialDoc) {
    record = Object.assign({}, initialDoc, record);
  }

  console.debug("Saving record: ", JSON.stringify(record, null, 2));

  pouchdbService.upsertDoc(record);

  onDialogOK();
}

// Print amount
function printAmount(amount: number) {
  return printAmountUtil(amount, recordCurrencyId.value);
}

// Watch wallet selection
watch(recordWalletId, async (newWalletId: any) => {
  if (newWalletId) {
    let wallet = (await entityService.getWallet(newWalletId)) as WalletWithPotentialBalance;
    await computationService.computeBalancesForWallets([wallet]);
    wallet.potentialBalance = 0;
    selectedWallet.value = wallet;
    
    // Update currency based on wallet if asset hasn't been selected yet
    if (!recordAssetId.value) {
      let currency = await entityService.getCurrency(wallet.currencyId);
      recordCurrencyId.value = currency._id!;
      recordCurrencySign.value = currency.sign;
    }
  } else {
    selectedWallet.value = null;
  }
});

// Watch asset selection to update currency
watch(recordAssetId, async (newAssetId: any) => {
  if (!newAssetId) {
    recordCurrencyId.value = null;
    recordCurrencySign.value = null;
    return;
  }
  let asset = await entityService.getAsset(newAssetId);
  let currency = await entityService.getCurrency(asset.currencyId);
  recordCurrencyId.value = currency._id!;
  recordCurrencySign.value = currency.sign;
});

// Watch amount and payment type to update potential balance
watch([recordAmount, recordAmountPaid, selectedWallet, paymentType], async () => {
  if (paymentType.value === "full") {
    recordAmountPaid.value = recordAmount.value;
  }
  recordAmountUnpaid.value = asAmount(recordAmount.value) - asAmount(recordAmountPaid.value);

  if (selectedWallet.value) {
    // For asset sale, money comes IN, so balance increases
    selectedWallet.value.potentialBalance = asAmount(selectedWallet.value._balance) + asAmount(recordAmountPaid.value);
    if (initialDoc && initialDoc.assetSale?.walletId === selectedWallet.value._id) {
      selectedWallet.value.potentialBalance -= asAmount(initialDoc.assetSale?.amountPaid || 0);
    }

    selectedWallet.value._minimumBalanceState = "not-set";
    if (!isNullOrUndefined(selectedWallet.value.minimumBalance)) {
      selectedWallet.value._minimumBalanceState = "normal";
    }
    if (asAmount(selectedWallet.value.minimumBalance) * 0.8 > selectedWallet.value.potentialBalance) {
      selectedWallet.value._minimumBalanceState = "warning";
    }
    if (asAmount(selectedWallet.value.minimumBalance) > selectedWallet.value.potentialBalance) {
      selectedWallet.value._minimumBalanceState = "exceeded";
    }
  }
});

// Cancel handler
const cancelClicked = onDialogCancel;
</script>
<style scoped lang="scss">
.wallet-balance-container {
  color: #546e7a;
  margin-top: -16px;
  margin-bottom: 12px;
  text-align: right;

  .wallet-limit-normal {
    color: #546e7a;
  }

  .wallet-limit-warning {
    color: #546e7a;
    border-bottom: 4px solid #ffd740;
  }

  .wallet-limit-exceeded {
    color: #bf360c;
  }
}

// Dark theme styling for wallet balance container
:deep(body.body--dark) .wallet-balance-container {
  color: #94a3b8; // slate-400 for better readability

  .wallet-limit-normal {
    color: #94a3b8;
  }

  .wallet-limit-warning {
    color: #fbbf24; // Amber warning color for dark theme
    border-bottom: 4px solid #fbbf24;
  }

  .wallet-limit-exceeded {
    color: #f87171; // Soft red for exceeded limit
  }
}
</style>
