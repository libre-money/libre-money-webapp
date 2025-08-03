<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing an Asset Sale Record" : "Adding an Asset Sale Record" }}
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
          <q-input type="number" filled v-model="recordAmountPaid" label="Amount Paid" lazy-rules :rules="validators.balance" v-if="paymentType == 'partial'" />
          <div v-if="paymentType == 'partial'">Amount remaining: {{ recordAmountUnpaid }}</div>

          <select-party v-model="recordPartyId" :mandatory="paymentType == 'unpaid' || paymentType == 'partial'"></select-party>
          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input type="textarea" filled v-model="recordNotes" label="Notes" lazy-rules :rules="validators.notes" />
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
import { Record } from "src/models/record";
import { dialogService } from "src/services/dialog-service";
import { entityService } from "src/services/entity-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { asAmount } from "src/utils/de-facto-utils";
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

// Cancel handler
const cancelClicked = onDialogCancel;
</script>
<style scoped lang="scss"></style>
