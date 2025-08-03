<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing an Asset Purchase Record" : "Adding an Asset Purchase Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-asset v-model="recordAssetId"></select-asset>
          <q-input type="number" filled v-model="recordAmount" label="Price of the Asset" lazy-rules :rules="validators.balance">
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

          <select-wallet
            v-model="recordWalletId"
            :limitByCurrencyId="recordCurrencyId"
            v-if="paymentType == 'full' || paymentType == 'partial'"
          ></select-wallet>
          <div class="wallet-balance-container" v-if="(paymentType == 'full' || paymentType == 'partial') && selectedWallet">
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

          <q-input type="number" filled v-model="recordAmountPaid" label="Amount Paid" lazy-rules :rules="validators.balance" v-if="paymentType == 'partial'" />
          <q-input
            type="number"
            readonly
            outlined
            v-model="recordAmountUnpaid"
            label="Amount Due"
            v-if="paymentType == 'partial'"
            style="margin-top: 8px; margin-bottom: 24px"
          />

          <select-party v-model="recordPartyId" :mandatory="paymentType == 'unpaid' || paymentType == 'partial'"></select-party>
          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input type="textarea" filled v-model="recordNotes" label="Notes" lazy-rules :rules="validators.notes" />
          <date-time-input v-model="transactionEpoch" label="Date & Time"></date-time-input>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-start std-bottom-action-row">
        <q-btn color="blue-grey" label="Cancel" @click="onDialogCancel" />
        <div class="spacer"></div>
        <q-btn-dropdown size="md" color="primary" label="Save" split @click="okClicked" style="margin-left: 8px">
          <q-list>
            <q-item clickable v-close-popup @click="saveAsTemplateClicked">
              <q-item-section>
                <q-item-label>Save as Template</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/models/record";
import { WalletWithPotentialBalance } from "src/models/wallet";
import { computationService } from "src/services/computation-service";
import { NotificationType, dialogService } from "src/services/dialog-service";
import { entityService } from "src/services/entity-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { asAmount, printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import { deepClone, isNullOrUndefined } from "src/utils/misc-utils";
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
  useTemplateId?: string | null;
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
const recordType = RecordType.ASSET_PURCHASE;

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

// Prefill logic
async function prefillRecord(prefilledRecord: Record): Promise<boolean> {
  console.debug("Applying prefilled record: ", prefilledRecord);
  if (!prefilledRecord || !prefilledRecord.assetPurchase) {
    await dialogService.alert("Error", "Invalid Record");
    onDialogCancel();
    return false;
  }

  recordAssetId.value = prefilledRecord.assetPurchase.assetId;
  recordAmount.value = asAmount(prefilledRecord.assetPurchase.amount);

  recordCurrencyId.value = prefilledRecord.assetPurchase.currencyId;
  recordPartyId.value = prefilledRecord.assetPurchase.partyId;
  recordWalletId.value = prefilledRecord.assetPurchase.walletId;
  recordAmountPaid.value = prefilledRecord.assetPurchase.amountPaid;
  recordAmountUnpaid.value = prefilledRecord.assetPurchase.amountUnpaid;
  recordTagIdList.value = prefilledRecord.tagIdList;
  recordNotes.value = prefilledRecord.notes;

  if (prefilledRecord.assetPurchase.amount === prefilledRecord.assetPurchase.amountPaid) {
    paymentType.value = "full";
  } else if (prefilledRecord.assetPurchase.amountPaid === 0) {
    paymentType.value = "unpaid";
  } else {
    paymentType.value = "partial";
  }

  return true;
}

// Initialization
onMounted(() => {
  if (props.existingRecordId) {
    isLoading.value = true;
    (async function () {
      isLoading.value = true;
      if (props.existingRecordId) {
        initialDoc = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
        if (!(await prefillRecord(initialDoc))) return;
        transactionEpoch.value = initialDoc.transactionEpoch || Date.now();
      }
      isLoading.value = false;
    })();
  } else if (props.useTemplateId) {
    isLoading.value = true;
    (async function () {
      isLoading.value = true;
      if (props.useTemplateId) {
        let templateDoc = (await pouchdbService.getDocById(props.useTemplateId)) as Record;
        if (!(await prefillRecord(templateDoc))) return;
        transactionEpoch.value = Date.now();
      }
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
      await dialogService.alert("Error", "For fully or partially paid asset purchases, Wallet is required.");
      return false;
    }
  }

  if (paymentType.value === "partial" || paymentType.value === "unpaid") {
    if (!recordPartyId.value) {
      await dialogService.alert("Error", "For partially paid and unpaid asset purchases, Party is required.");
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

  recordAmountUnpaid.value = asAmount(recordAmount.value) - asAmount(recordAmountPaid.value);

  return true;
}

// Record population
function populatePartialRecord(): Record {
  let record: Record = {
    $collection: "INVALID",
    notes: recordNotes.value!,
    type: recordType,
    tagIdList: recordTagIdList.value,
    transactionEpoch: transactionEpoch.value,
    assetPurchase: {
      assetId: recordAssetId.value!,
      amount: asAmount(recordAmount.value),
      currencyId: recordCurrencyId.value!,
      partyId: recordPartyId.value,
      walletId: recordWalletId.value!,
      amountPaid: asAmount(recordAmountPaid.value),
      amountUnpaid: asAmount(recordAmountUnpaid.value),
    },
  };

  return record;
}

// Save actions
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

// Print amount
function printAmount(amount: number) {
  return printAmountUtil(amount, recordCurrencyId.value);
}

// Watchers
watch(recordWalletId, async (newWalletId: any) => {
  if (newWalletId) {
    let wallet = (await entityService.getWallet(newWalletId)) as WalletWithPotentialBalance;
    await computationService.computeBalancesForWallets([wallet]);
    wallet.potentialBalance = 0;
    selectedWallet.value = wallet;
  } else {
    selectedWallet.value = null;
  }
});

watch(recordAssetId, async (newAssetId: any) => {
  if (!newAssetId) return;
  let asset = await entityService.getAsset(newAssetId);
  let currency = await entityService.getCurrency(asset.currencyId);
  recordCurrencyId.value = currency._id!;
  recordCurrencySign.value = currency.sign;
});

watch([recordAmount, recordAmountPaid, selectedWallet, paymentType], async () => {
  if (paymentType.value === "full") {
    recordAmountPaid.value = recordAmount.value;
  }
  recordAmountUnpaid.value = asAmount(recordAmount.value) - asAmount(recordAmountPaid.value);

  if (selectedWallet.value) {
    selectedWallet.value.potentialBalance = asAmount(selectedWallet.value._balance) - asAmount(recordAmountPaid.value);
    if (initialDoc && initialDoc.expense?.walletId === selectedWallet.value._id) {
      selectedWallet.value.potentialBalance += asAmount(initialDoc.assetPurchase?.amountPaid || 0);
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
</style>
