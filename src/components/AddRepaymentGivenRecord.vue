<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing a Repayment Given Record" : "Adding a Repayment Given Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-party v-model="recordPartyId" mandatory></select-party>

          <select-wallet v-model="recordWalletId" :limitByCurrencyId="recordCurrencyId"></select-wallet>

          <div v-if="suggestedAmount">Total Owed to Party: {{ suggestedAmount }}</div>

          <q-input type="number" standout="bg-primary text-white" v-model="recordAmount" label="Given Amount" lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">
                {{ recordCurrencySign }}
              </div>
            </template>
          </q-input>

          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input type="textarea" standout="bg-primary text-white" v-model="recordNotes" label="Notes" lazy-rules :rules="validators.notes" />
          <date-time-input v-model="transactionEpoch" label="Date & Time"></date-time-input>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Cancel" @click="onDialogCancel" />
        <q-btn color="primary" label="OK" @click="okClicked" />
      </q-card-actions>
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
import SelectParty from "./SelectParty.vue";
import SelectTag from "./SelectTag.vue";
import { asAmount } from "src/utils/de-facto-utils";
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
    let wallet = await entityService.getWallet(newWalletId as string);
    let currency = await entityService.getCurrency(wallet.currencyId);
    recordCurrencySign.value = currency.sign;
  } else {
    recordCurrencySign.value = null;
  }
});
</script>
<style scoped lang="scss"></style>
