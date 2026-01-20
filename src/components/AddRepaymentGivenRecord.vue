<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink">
        <div class="std-dialog-title text-primary text-weight-bold">
          {{ existingRecordId ? "Editing a Repayment Given Record" : "Adding a Repayment Given Record" }}
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="col scroll" style="min-height: 0">
        <q-form class="q-gutter-md q-pa-md1" ref="recordForm">
          <date-time-input v-model="transactionEpoch" label="Date & Time"></date-time-input>
          <select-party v-model="recordPartyId" mandatory></select-party>

          <select-wallet v-model="recordWalletId" :limitByCurrencyId="recordCurrencyId"></select-wallet>
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

          <div v-if="suggestedAmount">Total Owed to Party: {{ suggestedAmount }}</div>

          <q-input type="number" standout="bg-primary text-white" v-model="recordAmount" label="Given Amount" lazy-rules
            :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">
                {{ recordCurrencySign }}
              </div>
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
import { ref, watch, onMounted } from "vue";
import { validators } from "src/utils/validators";
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/schemas/record";
import { WalletWithPotentialBalance } from "src/schemas/wallet";
import { computationService } from "src/services/computation-service";
import { pouchdbService } from "src/services/pouchdb-service";
import SelectWallet from "./SelectWallet.vue";
import SelectParty from "./SelectParty.vue";
import SelectTag from "./SelectTag.vue";
import { asAmount, printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import { isNullOrUndefined } from "src/utils/misc-utils";
import { entityService } from "src/services/entity-service";
import DateTimeInput from "./lib/DateTimeInput.vue";

// Props
const props = defineProps<{
  existingRecordId?: string | null;
  suggestedCurrencyId?: string | null;
  suggestedPartyId?: string | null;
  suggestedAmount?: number | null;
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
const recordType = RecordType.REPAYMENT_GIVEN;

const recordAmount = ref<number>(0);
const recordCurrencyId = ref<string | null>(null);
const recordCurrencySign = ref<string | null>(null);
const recordPartyId = ref<string | null>(null);
const recordWalletId = ref<string | null>(null);
const recordTagIdList = ref<string[]>([]);
const recordNotes = ref<string | null>(null);

const selectedWallet = ref<WalletWithPotentialBalance | null>(null);

const transactionEpoch = ref<number>(Date.now());

// Load initial data
onMounted(async () => {
  if (props.existingRecordId) {
    isLoading.value = true;
    let res = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
    initialDoc = res;
    if (!initialDoc.repaymentGiven) {
      // TODO show error message
      isLoading.value = false;
      return;
    }
    recordAmount.value = asAmount(initialDoc.repaymentGiven.amount);
    recordCurrencyId.value = initialDoc.repaymentGiven.currencyId;
    recordPartyId.value = initialDoc.repaymentGiven.partyId;
    recordWalletId.value = initialDoc.repaymentGiven.walletId!;

    recordTagIdList.value = initialDoc.tagIdList;
    recordNotes.value = initialDoc.notes;

    isLoading.value = false;
  } else {
    if (props.suggestedCurrencyId) recordCurrencyId.value = props.suggestedCurrencyId;
    if (props.suggestedPartyId) recordPartyId.value = props.suggestedPartyId;
    if (props.suggestedAmount !== undefined && props.suggestedAmount !== null) recordAmount.value = props.suggestedAmount;
  }
});

// Manual validation stub
async function performManualValidation() {
  return true;
}

// OK button handler
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
    repaymentGiven: {
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

// Watchers for currency sign
watch(recordCurrencyId, async (currencyId: any) => {
  if (currencyId) {
    recordCurrencySign.value = (await entityService.getCurrency(currencyId)).sign;
  } else {
    recordCurrencySign.value = null;
  }
});

watch(recordWalletId, async (newWalletId: any) => {
  if (newWalletId) {
    let wallet = (await entityService.getWallet(newWalletId as string)) as WalletWithPotentialBalance;
    await computationService.computeBalancesForWallets([wallet]);
    wallet.potentialBalance = 0;
    selectedWallet.value = wallet;
    let currency = await entityService.getCurrency(wallet.currencyId);
    recordCurrencySign.value = currency.sign;
  } else {
    recordCurrencySign.value = null;
    selectedWallet.value = null;
  }
});

// Watch amount to update potential balance
watch([recordAmount, selectedWallet], async () => {
  if (selectedWallet.value) {
    // For repayment given, money goes OUT, so balance decreases
    selectedWallet.value.potentialBalance = asAmount(selectedWallet.value._balance) - asAmount(recordAmount.value);
    if (initialDoc && initialDoc.repaymentGiven?.walletId === selectedWallet.value._id) {
      selectedWallet.value.potentialBalance += asAmount(initialDoc.repaymentGiven?.amount || 0);
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
