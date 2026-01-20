<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink">
        <div class="std-dialog-title text-primary text-weight-bold">
          {{ existingRecordId ? "Editing an Income Record" : "Adding an Income Record" }}
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="col scroll" style="min-height: 0">
        <q-form class="q-gutter-md" ref="recordForm">
          <date-time-input v-model="transactionEpoch" label="Date & Time"></date-time-input>
          <select-income-source v-model="recordIncomeSourceId"></select-income-source>
          <q-input input-class="text-h6" type="number" standout="bg-primary text-white" v-model="recordAmount"
            label="Income Amount" lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <!-- <div class="currency-label">{{ recordCurrencySign }}</div> -->
              <q-btn-dropdown flat dense color="primary" :label="recordCurrencySign as string">
                <q-list style="min-width: 160px">
                  <q-item v-for="curr in fullWalletCurrencyList" :key="curr._id" clickable v-close-popup @click="
                    recordCurrencyId = curr._id ?? null;
                  recordCurrencySign = curr.sign ?? null;
                  ">
                    <q-item-section>
                      <q-item-label>{{ curr.sign }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </template>
          </q-input>
          <!-- <select-currency v-model="recordCurrencyId"></select-currency> -->

          <q-tabs v-model="paymentType" inline-label
            class="bg-blue-grey-11 text-grey-7 shadow-1 rounded-borders q-mb-lg" active-color="teal-9"
            active-bg-color="teal-3" indicator-color="transparent">
            <q-tab name="full" label="Paid" />
            <q-tab name="partial" label="Partially Paid" />
            <q-tab name="unpaid" label="Unpaid" />
          </q-tabs>

          <select-wallet v-model="recordWalletId" v-if="paymentType == 'full' || paymentType == 'partial'"
            :limitByCurrencyId="recordCurrencyId">
          </select-wallet>

          <q-input type="number" standout="bg-primary text-white" v-model="recordAmountPaid" label="Amount Paid"
            lazy-rules :rules="validators.balance" v-if="paymentType == 'partial'" />
          <div v-if="paymentType == 'partial'">Amount remaining: {{ recordAmountUnpaid }}</div>

          <select-party v-model="recordPartyId"
            :mandatory="paymentType == 'unpaid' || paymentType == 'partial'"></select-party>
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
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/schemas/record";
import { NotificationType, dialogService } from "src/services/dialog-service";
import { entityService } from "src/services/entity-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { useSettingsStore } from "src/stores/settings";
import { asAmount } from "src/utils/de-facto-utils";
import { deepClone } from "src/utils/misc-utils";
import { validators } from "src/utils/validators";
import { onMounted, ref, watch, Ref } from "vue";
import DateTimeInput from "./lib/DateTimeInput.vue";
import { Currency } from "src/schemas/currency";
import SelectCurrency from "./SelectCurrency.vue";
import SelectIncomeSource from "./SelectIncomeSource.vue";
import SelectParty from "./SelectParty.vue";
import SelectTag from "./SelectTag.vue";
import SelectWallet from "./SelectWallet.vue";

// Props
const props = defineProps<{
  existingRecordId?: string | null;
  useTemplateId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const settingsStore = useSettingsStore();

let initialDoc: Record | null = null;
const isLoading = ref(false);

const recordForm = ref<QForm | null>(null);

const paymentType = ref<string>("full");
const recordType = RecordType.INCOME;

const recordIncomeSourceId = ref<string | null>(null);
const recordAmount = ref<number>(0);
const recordCurrencyId = ref<string | null>(null);
const recordCurrencySign = ref<string | null>(null);
const recordPartyId = ref<string | null>(null);
const recordWalletId = ref<string | null>(null);
const recordAmountPaid = ref<number>(0);
const recordAmountUnpaid = ref<number>(0);
const recordTagIdList = ref<string[]>([]);
const recordNotes = ref<string | null>(null);

const transactionEpoch = ref<number>(Date.now());

async function prefillRecord(prefilledRecord: Record): Promise<boolean> {
  console.debug("Applying prefilled record: ", prefilledRecord);
  if (!prefilledRecord || !prefilledRecord.income) {
    await dialogService.alert("Error", "Invalid Record");
    onDialogCancel();
    return false;
  }

  recordIncomeSourceId.value = prefilledRecord.income.incomeSourceId;
  recordAmount.value = asAmount(prefilledRecord.income.amount);

  recordCurrencyId.value = prefilledRecord.income.currencyId;
  recordPartyId.value = prefilledRecord.income.partyId;
  recordWalletId.value = prefilledRecord.income.walletId!;
  recordAmountPaid.value = prefilledRecord.income.amountPaid;
  recordAmountUnpaid.value = prefilledRecord.income.amountUnpaid;
  recordTagIdList.value = prefilledRecord.tagIdList;
  recordNotes.value = prefilledRecord.notes;

  if (prefilledRecord.income.amount === prefilledRecord.income.amountPaid) {
    paymentType.value = "full";
  } else if (prefilledRecord.income.amountPaid === 0) {
    paymentType.value = "unpaid";
  } else {
    paymentType.value = "partial";
  }

  return true;
}

// Prefill logic
onMounted(() => {
  if (props.existingRecordId) {
    isLoading.value = true;
    (async function () {
      isLoading.value = true;
      initialDoc = (await pouchdbService.getDocById(props.existingRecordId!)) as Record;
      if (!(await prefillRecord(initialDoc))) return;
      transactionEpoch.value = initialDoc.transactionEpoch || Date.now();
      isLoading.value = false;
    })();
  } else if (props.useTemplateId) {
    isLoading.value = true;
    (async function () {
      isLoading.value = true;
      let templateDoc = (await pouchdbService.getDocById(props.useTemplateId!)) as Record;
      if (!(await prefillRecord(templateDoc))) return;
      transactionEpoch.value = Date.now();
      isLoading.value = false;
    })();
  } else {
    setTimeout(() => {
      recordCurrencyId.value = settingsStore.defaultCurrencyId;
    }, 0);
  }
});

async function performManualValidation() {
  if (paymentType.value === "full" || paymentType.value === "partial") {
    if (!recordWalletId.value) {
      await dialogService.alert("Error", "For fully or partially paid incomes, Wallet is required.");
      return false;
    }
  }

  if (paymentType.value === "partial" || paymentType.value === "unpaid") {
    if (!recordPartyId.value) {
      await dialogService.alert("Error", "For partially paid and unpaid incomes, Party is required.");
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

function populatePartialRecord(): Record {
  let record: Record = {
    $collection: "INVALID",
    notes: recordNotes.value!,
    type: recordType,
    tagIdList: recordTagIdList.value,
    transactionEpoch: transactionEpoch.value,
    income: {
      incomeSourceId: recordIncomeSourceId.value!,
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

const fullWalletCurrencyList: Ref<Currency[]> = ref([]);

async function loadData() {
  fullWalletCurrencyList.value = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
  fullWalletCurrencyList.value.sort((a, b) => a.name.localeCompare(b.name));
}

loadData();

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

watch(recordCurrencyId, async (newCurrencyId: any) => {
  if (!newCurrencyId) {
    recordCurrencySign.value = null;
    return;
  }
  let currency = await entityService.getCurrency(newCurrencyId);
  recordCurrencySign.value = currency.sign;
});
</script>
<style scoped lang="scss"></style>
