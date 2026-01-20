<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink">
        <div class="std-dialog-title text-primary text-weight-bold">
          {{ existingRecordId ? "Editing a Borrowing Record" : "Adding a Borrowing Record" }}
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="col scroll" style="min-height: 0">
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <date-time-input v-model="transactionEpoch" label="Date & Time"></date-time-input>
          <select-party v-model="recordPartyId" mandatory></select-party>

          <select-wallet v-model="recordWalletId"></select-wallet>
          <div class="wallet-balance-container" v-if="selectedWallet">
            <div>Balance in wallet: {{ printAmount(selectedWallet._balance!) }}</div>
            <div style="margin-top: 8px">Balance afterwards will be: {{ printAmount(selectedWallet.potentialBalance) }}</div>
          </div>

          <q-input type="number" standout="bg-primary text-white" v-model="recordAmount" label="Borrowed Amount"
            lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">{{ recordCurrencySign }}</div>
            </template>
          </q-input>

          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input type="textarea" standout="bg-primary text-white" v-model="recordNotes" label="Notes" lazy-rules
            :rules="validators.notes" />
        </q-form>
      </q-card-section>
      <q-separator />
      <q-card-section class="no-shrink">
        <div class="flex">
          <q-btn flat rounded label="Cancel" @click="cancelClicked" />
          <div class="spacer"></div>
          <q-btn rounded color="primary" :label="existingRecordId ? 'Update' : 'Add'" @click="okClicked" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent, useQuasar } from "quasar";
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/schemas/record";
import { WalletWithPotentialBalance } from "src/schemas/wallet";
import { computationService } from "src/services/computation-service";
import { entityService } from "src/services/entity-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { asAmount, printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import { isNullOrUndefined } from "src/utils/misc-utils";
import { validators } from "src/utils/validators";
import { onMounted, ref, watch } from "vue";
import DateTimeInput from "./lib/DateTimeInput.vue";
import SelectParty from "./SelectParty.vue";
import SelectTag from "./SelectTag.vue";
import SelectWallet from "./SelectWallet.vue";

// Props
const props = defineProps<{
  existingRecordId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const $q = useQuasar();

// State
let initialDoc: Record | null = null;
const isLoading = ref(false);

const recordForm = ref<QForm | null>(null);

const paymentType = ref<string | null>("full");
const recordType = RecordType.BORROWING;

const recordAmount = ref<number>(0);
const recordCurrencyId = ref<string | null>(null);
const recordCurrencySign = ref<string | null>(null);
const recordPartyId = ref<string | null>(null);
const recordWalletId = ref<string | null>(null);
const recordTagIdList = ref<string[]>([]);
const recordNotes = ref<string | null>(null);

const selectedWallet = ref<WalletWithPotentialBalance | null>(null);

const transactionEpoch = ref<number>(Date.now());

// Load existing record if editing
onMounted(async () => {
  if (props.existingRecordId) {
    isLoading.value = true;
    let res = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
    initialDoc = res;
    if (!initialDoc.borrowing) {
      // TODO show error message
      isLoading.value = false;
      return;
    }
    recordAmount.value = asAmount(initialDoc.borrowing.amount);
    recordCurrencyId.value = initialDoc.borrowing.currencyId;
    recordPartyId.value = initialDoc.borrowing.partyId;
    recordWalletId.value = initialDoc.borrowing.walletId!;

    recordTagIdList.value = initialDoc.tagIdList;
    recordNotes.value = initialDoc.notes;

    transactionEpoch.value = initialDoc.transactionEpoch || Date.now();

    isLoading.value = false;
  }
});

// Manual validation (expand if needed)
async function performManualValidation() {
  return true;
}

// Save record
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
    borrowing: {
      amount: asAmount(recordAmount.value),
      walletId: recordWalletId.value!,
      currencyId: recordCurrencyId.value!,
      partyId: recordPartyId.value!,
    },
  };

  if (initialDoc) {
    record = Object.assign({}, initialDoc, record);
  }

  console.debug("Saving record: ", JSON.stringify(record, null, 2));

  pouchdbService.upsertDoc(record);

  onDialogOK();
}

function cancelClicked() {
  onDialogCancel();
}

// Print amount
function printAmount(amount: number) {
  return printAmountUtil(amount, recordCurrencyId.value);
}

// Watch wallet and update currency
watch(recordWalletId, async (newWalletId: any) => {
  if (!newWalletId) {
    recordCurrencyId.value = null;
    recordCurrencySign.value = null;
    selectedWallet.value = null;
    return;
  }
  let wallet = (await entityService.getWallet(newWalletId as string)) as WalletWithPotentialBalance;
  await computationService.computeBalancesForWallets([wallet]);
  wallet.potentialBalance = 0;
  selectedWallet.value = wallet;
  let currency = await entityService.getCurrency(wallet.currencyId);
  recordCurrencyId.value = currency._id!;
  recordCurrencySign.value = currency.sign;
});

// Watch amount to update potential balance
watch([recordAmount, selectedWallet], async () => {
  if (selectedWallet.value) {
    // For borrowing, money comes IN, so balance increases
    selectedWallet.value.potentialBalance = asAmount(selectedWallet.value._balance) + asAmount(recordAmount.value);
    if (initialDoc && initialDoc.borrowing?.walletId === selectedWallet.value._id) {
      selectedWallet.value.potentialBalance -= asAmount(initialDoc.borrowing?.amount || 0);
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
