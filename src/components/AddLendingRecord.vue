<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing a Lending Record" : "Adding a Lending Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-party v-model="recordPartyId" mandatory></select-party>

          <select-wallet v-model="recordWalletId"></select-wallet>

          <q-input type="number" filled v-model="recordAmount" label="Lending Amount" lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">{{ recordCurrencySign }}</div>
            </template>
          </q-input>

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

const props = defineProps<{
  existingRecordId?: string | null;
}>();

const emit = defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

let initialDoc: Record | null = null;
const isLoading = ref(false);

const recordForm = ref<QForm | null>(null);

const paymentType = ref<string | null>("full");
const recordType = RecordType.LENDING;

const recordAmount = ref<number>(0);
const recordCurrencyId = ref<string | null>(null);
const recordCurrencySign = ref<string | null>(null);
const recordPartyId = ref<string | null>(null);
const recordWalletId = ref<string | null>(null);
const recordTagIdList = ref<string[]>([]);
const recordNotes = ref<string | null>(null);

const transactionEpoch = ref<number>(Date.now());

onMounted(async () => {
  if (props.existingRecordId) {
    isLoading.value = true;
    let res = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
    initialDoc = res;
    if (!initialDoc.lending) {
      // TODO show error message
      isLoading.value = false;
      return;
    }
    recordAmount.value = asAmount(initialDoc.lending.amount);
    recordCurrencyId.value = initialDoc.lending.currencyId;
    recordPartyId.value = initialDoc.lending.partyId;
    recordWalletId.value = initialDoc.lending.walletId!;

    recordTagIdList.value = initialDoc.tagIdList;
    recordNotes.value = initialDoc.notes;

    isLoading.value = false;
  }
});

async function performManualValidation() {
  return true;
}

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
    lending: {
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
