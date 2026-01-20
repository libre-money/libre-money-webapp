<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink">
        <div class="std-dialog-title text-primary text-weight-bold">
          {{ existingRecordId ? "Editing a Money Transfer Record" : "Adding a Money Transfer Record" }}
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="col scroll" style="min-height: 0">
        <q-form class="q-gutter-md" ref="recordForm">
          <date-time-input v-model="transactionEpoch" label="Date & Time"></date-time-input>
          <select-wallet v-model="recordFromWalletId" label="From Wallet (Source)" :rules="validators.required">
          </select-wallet>
          <div class="wallet-balance-container" v-if="selectedFromWallet">
            <div>Balance in wallet: {{ printFromAmount(selectedFromWallet._balance!) }}</div>
            <div style="margin-top: 8px">Balance afterwards will be: {{ printFromAmount(selectedFromWallet.potentialBalance) }}</div>
            <div class="wallet-limit" style="margin-top: 8px" v-if="selectedFromWallet._minimumBalanceState !== 'not-set'">
              <span class="wallet-limit-warning" v-if="selectedFromWallet._minimumBalanceState === 'warning'">
                Approaching limit {{ printFromAmount(selectedFromWallet.minimumBalance!) }}
              </span>
              <span class="wallet-limit-exceeded" v-else-if="selectedFromWallet._minimumBalanceState === 'exceeded'">
                Exceeded limit {{ printFromAmount(selectedFromWallet.minimumBalance!) }}
              </span>
              <span class="wallet-limit-normal" v-else-if="selectedFromWallet._minimumBalanceState === 'normal'">
                Limit {{ printFromAmount(selectedFromWallet.minimumBalance!) }}
              </span>
            </div>
          </div>
          <q-input input-class="text-h6" type="number" standout="bg-primary text-white" v-model="recordFromAmount"
            label="Source Amount" lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">{{ recordFromCurrencySign }}</div>
            </template>
          </q-input>

          <select-wallet v-model="recordToWalletId" label="To Wallet (Destination)" :rules="validators.required">
          </select-wallet>
          <div class="wallet-balance-container" v-if="selectedToWallet">
            <div>Balance in wallet: {{ printToAmount(selectedToWallet._balance!) }}</div>
            <div style="margin-top: 8px">Balance afterwards will be: {{ printToAmount(selectedToWallet.potentialBalance) }}</div>
          </div>
          <q-input input-class="text-h6" type="number" standout="bg-primary text-white" v-model="recordToAmount"
            label="Destination Amount" lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">{{ recordToCurrencySign }}</div>
            </template>
          </q-input>

          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input standout="bg-primary text-white" type="textarea" v-model="recordNotes" label="Notes" lazy-rules
            :rules="validators.notes" />
        </q-form>
      </q-card-section>
      <q-separator />
      <q-card-section class="no-shrink">
        <div class="flex">
          <q-btn flat rounded label="Cancel" @click="onDialogCancel" />
          <div class="spacer"></div>
          <q-btn-dropdown rounded color="primary" label="Save" split @click="okClicked">
            <q-list>
              <q-item clickable v-close-popup @click="saveAsTemplateClicked">
                <q-item-section>
                  <q-item-label>Save as Template</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { ref, watch, onMounted } from "vue";
import { validators } from "src/utils/validators";
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/schemas/record";
import { WalletWithPotentialBalance } from "src/schemas/wallet";
import { computationService } from "src/services/computation-service";
import { pouchdbService } from "src/services/pouchdb-service";
import SelectWallet from "./SelectWallet.vue";
import SelectTag from "./SelectTag.vue";
import { deepClone, isNullOrUndefined } from "src/utils/misc-utils";
import { asAmount, printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import { entityService } from "src/services/entity-service";
import DateTimeInput from "./lib/DateTimeInput.vue";
import { NotificationType, dialogService } from "src/services/dialog-service";
import { computed } from "vue";

// Props
const props = defineProps<{
  existingRecordId?: string | null;
  useTemplateId?: string | null;
}>();

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// Emits
defineEmits([...useDialogPluginComponent.emits]);

// State
let initialDoc: Record | null = null;
const isLoading = ref(false);

const recordForm = ref<QForm | null>(null);

const recordType = RecordType.MONEY_TRANSFER;

const recordFromAmount = ref<number>();
const recordFromCurrencyId = ref<string | null>(null);
const recordFromWalletId = ref<string | null>(null);
const recordFromCurrencySign = ref<string | null>(null);

const recordToAmount = ref<number>();
const recordToCurrencyId = ref<string | null>(null);
const recordToWalletId = ref<string | null>(null);
const recordToCurrencySign = ref<string | null>(null);

const recordTagIdList = ref<string[]>([]);
const recordNotes = ref<string | null>(null);

const selectedFromWallet = ref<WalletWithPotentialBalance | null>(null);
const selectedToWallet = ref<WalletWithPotentialBalance | null>(null);

const transactionEpoch = ref<number>(Date.now());

// Prefill logic
async function prefillRecord(prefilledRecord: Record): Promise<boolean> {
  console.debug("Applying prefilled record: ", prefilledRecord);
  if (!prefilledRecord || !prefilledRecord.moneyTransfer) {
    await dialogService.alert("Error", "Invalid Record");
    onDialogCancel();
    return false;
  }

  recordFromAmount.value = asAmount(prefilledRecord.moneyTransfer.fromAmount);
  recordFromCurrencyId.value = prefilledRecord.moneyTransfer.fromCurrencyId;
  recordFromWalletId.value = prefilledRecord.moneyTransfer.fromWalletId;

  recordToAmount.value = asAmount(prefilledRecord.moneyTransfer.toAmount);
  recordToCurrencyId.value = prefilledRecord.moneyTransfer.toCurrencyId;
  recordToWalletId.value = prefilledRecord.moneyTransfer.toWalletId;

  recordTagIdList.value = prefilledRecord.tagIdList;
  recordNotes.value = prefilledRecord.notes;

  return true;
}

// Load initial data
onMounted(async () => {
  if (props.existingRecordId) {
    isLoading.value = true;
    initialDoc = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
    if (!(await prefillRecord(initialDoc))) return;
    transactionEpoch.value = initialDoc.transactionEpoch || Date.now();
    isLoading.value = false;
  } else if (props.useTemplateId) {
    isLoading.value = true;
    let templateDoc = (await pouchdbService.getDocById(props.useTemplateId)) as Record;
    if (!(await prefillRecord(templateDoc))) return;
    transactionEpoch.value = Date.now();
    isLoading.value = false;
  }
});

// Manual validation stub
async function performManualValidation() {
  return true;
}

// Build record object
function populatePartialRecord() {
  let record: Record = {
    $collection: "INVALID",
    notes: recordNotes.value!,
    type: recordType,
    tagIdList: recordTagIdList.value,
    transactionEpoch: transactionEpoch.value,
    moneyTransfer: {
      fromAmount: asAmount(recordFromAmount.value),
      fromCurrencyId: recordFromCurrencyId.value!,
      fromWalletId: recordFromWalletId.value!,
      toAmount: asAmount(recordToAmount.value),
      toCurrencyId: recordToCurrencyId.value!,
      toWalletId: recordToWalletId.value!,
    },
  };

  return record;
}

// Save record
async function okClicked() {
  if (!(await recordForm.value?.validate())) return;
  if (!(await performManualValidation())) return;

  let record: Record = populatePartialRecord();
  record.$collection = Collection.RECORD;

  if (initialDoc) {
    record = Object.assign({}, initialDoc, record);
  }

  console.debug("Saving record: ", deepClone(record));
  pouchdbService.upsertDoc(record);
  onDialogOK();
}

// Save as template
async function saveAsTemplateClicked() {
  if (!(await performManualValidation())) return;

  let templateName = await dialogService.prompt("Saving as template", "Provide a unique name for the template", "");
  if (!templateName) return;

  let partialRecord: Record = populatePartialRecord();
  partialRecord.$collection = Collection.RECORD_TEMPLATE;
  partialRecord.templateName = templateName;

  console.debug("Saving record as template: ", deepClone(partialRecord));
  pouchdbService.upsertDoc(partialRecord);
  dialogService.notify(NotificationType.SUCCESS, "Template saved.");
  onDialogCancel();
}

// Print amount functions
function printFromAmount(amount: number) {
  return printAmountUtil(amount, recordFromCurrencyId.value);
}

function printToAmount(amount: number) {
  return printAmountUtil(amount, recordToCurrencyId.value);
}

// Watchers for wallet/currency
watch(recordFromWalletId, async (newWalletId: any) => {
  if (!newWalletId) {
    recordFromCurrencyId.value = null;
    recordFromCurrencySign.value = null;
    selectedFromWallet.value = null;
    return;
  }
  let wallet = (await entityService.getWallet(newWalletId as string)) as WalletWithPotentialBalance;
  await computationService.computeBalancesForWallets([wallet]);
  wallet.potentialBalance = 0;
  selectedFromWallet.value = wallet;
  let currency = await entityService.getCurrency(wallet.currencyId);
  recordFromCurrencyId.value = currency._id!;
  recordFromCurrencySign.value = currency.sign;
});

watch(recordToWalletId, async (newWalletId: any) => {
  if (!newWalletId) {
    recordToCurrencyId.value = null;
    recordToCurrencySign.value = null;
    selectedToWallet.value = null;
    return;
  }
  let wallet = (await entityService.getWallet(newWalletId as string)) as WalletWithPotentialBalance;
  await computationService.computeBalancesForWallets([wallet]);
  wallet.potentialBalance = 0;
  selectedToWallet.value = wallet;
  let currency = await entityService.getCurrency(wallet.currencyId);
  recordToCurrencyId.value = currency._id!;
  recordToCurrencySign.value = currency.sign;
});

// Watch amounts to update potential balances
watch([recordFromAmount, recordToAmount, selectedFromWallet, selectedToWallet], async () => {
  // Update from wallet balance (money goes OUT, so balance decreases)
  if (selectedFromWallet.value) {
    selectedFromWallet.value.potentialBalance = asAmount(selectedFromWallet.value._balance) - asAmount(recordFromAmount.value);
    if (initialDoc && initialDoc.moneyTransfer?.fromWalletId === selectedFromWallet.value._id) {
      selectedFromWallet.value.potentialBalance += asAmount(initialDoc.moneyTransfer?.fromAmount || 0);
    }

    selectedFromWallet.value._minimumBalanceState = "not-set";
    if (!isNullOrUndefined(selectedFromWallet.value.minimumBalance)) {
      selectedFromWallet.value._minimumBalanceState = "normal";
    }
    if (asAmount(selectedFromWallet.value.minimumBalance) * 0.8 > selectedFromWallet.value.potentialBalance) {
      selectedFromWallet.value._minimumBalanceState = "warning";
    }
    if (asAmount(selectedFromWallet.value.minimumBalance) > selectedFromWallet.value.potentialBalance) {
      selectedFromWallet.value._minimumBalanceState = "exceeded";
    }
  }

  // Update to wallet balance (money comes IN, so balance increases)
  if (selectedToWallet.value) {
    selectedToWallet.value.potentialBalance = asAmount(selectedToWallet.value._balance) + asAmount(recordToAmount.value);
    if (initialDoc && initialDoc.moneyTransfer?.toWalletId === selectedToWallet.value._id) {
      selectedToWallet.value.potentialBalance -= asAmount(initialDoc.moneyTransfer?.toAmount || 0);
    }

    selectedToWallet.value._minimumBalanceState = "not-set";
    if (!isNullOrUndefined(selectedToWallet.value.minimumBalance)) {
      selectedToWallet.value._minimumBalanceState = "normal";
    }
    if (asAmount(selectedToWallet.value.minimumBalance) * 0.8 > selectedToWallet.value.potentialBalance) {
      selectedToWallet.value._minimumBalanceState = "warning";
    }
    if (asAmount(selectedToWallet.value.minimumBalance) > selectedToWallet.value.potentialBalance) {
      selectedToWallet.value._minimumBalanceState = "exceeded";
    }
  }
});
</script>
<style scoped lang="scss">
.currency-label {
  font-size: 18px;
}

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
