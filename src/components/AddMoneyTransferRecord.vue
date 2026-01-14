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
          <select-wallet v-model="recordFromWalletId" label="From Wallet (Source)" :rules="validators.required"> </select-wallet>
          <q-input
            input-class="text-h6"
            type="number"
            standout="bg-primary text-white"
            v-model="recordFromAmount"
            label="Source Amount"
            lazy-rules
            :rules="validators.balance"
          >
            <template v-slot:append>
              <div class="currency-label">{{ recordFromCurrencySign }}</div>
            </template>
          </q-input>

          <select-wallet v-model="recordToWalletId" label="To Wallet (Destination)" :rules="validators.required"> </select-wallet>
          <q-input
            input-class="text-h6"
            type="number"
            standout="bg-primary text-white"
            v-model="recordToAmount"
            label="Destination Amount"
            lazy-rules
            :rules="validators.balance"
          >
            <template v-slot:append>
              <div class="currency-label">{{ recordToCurrencySign }}</div>
            </template>
          </q-input>

          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input standout="bg-primary text-white" type="textarea" v-model="recordNotes" label="Notes" lazy-rules :rules="validators.notes" />
        </q-form>
      </q-card-section>
      <q-separator />
      <q-card-section class="no-shrink">
        <div class="flex">
          <q-btn flat rounded size="lg" label="Cancel" @click="onDialogCancel" />
          <div class="spacer"></div>
          <q-btn-dropdown rounded size="lg" color="primary" label="Save" split @click="okClicked">
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
import { Record } from "src/models/record";
import { pouchdbService } from "src/services/pouchdb-service";
import SelectWallet from "./SelectWallet.vue";
import SelectTag from "./SelectTag.vue";
import { deepClone } from "src/utils/misc-utils";
import { asAmount } from "src/utils/de-facto-utils";
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

// Watchers for wallet/currency
watch(recordFromWalletId, async (newWalletId: any) => {
  if (!newWalletId) {
    recordFromCurrencyId.value = null;
    recordFromCurrencySign.value = null;
    return;
  }
  let wallet = await entityService.getWallet(newWalletId as string);
  let currency = await entityService.getCurrency(wallet.currencyId);
  recordFromCurrencyId.value = currency._id!;
  recordFromCurrencySign.value = currency.sign;
});

watch(recordToWalletId, async (newWalletId: any) => {
  if (!newWalletId) {
    recordToCurrencyId.value = null;
    recordToCurrencySign.value = null;
    return;
  }
  let wallet = await entityService.getWallet(newWalletId as string);
  let currency = await entityService.getCurrency(wallet.currencyId);
  recordToCurrencyId.value = currency._id!;
  recordToCurrencySign.value = currency.sign;
});
</script>
<style scoped lang="scss">
.currency-label {
  font-size: 18px;
}
</style>
