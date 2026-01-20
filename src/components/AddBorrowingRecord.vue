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
import { Record } from "src/models/record";
import { entityService } from "src/services/entity-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { asAmount } from "src/utils/de-facto-utils";
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

// Watch wallet and update currency
watch(recordWalletId, async (newWalletId: any) => {
  if (!newWalletId) {
    recordCurrencyId.value = null;
    recordCurrencySign.value = null;
    return;
  }
  let wallet = await entityService.getWallet(newWalletId as string);
  let currency = await entityService.getCurrency(wallet.currencyId);
  recordCurrencyId.value = currency._id!;
  recordCurrencySign.value = currency.sign;
});
</script>
<style scoped lang="scss"></style>
