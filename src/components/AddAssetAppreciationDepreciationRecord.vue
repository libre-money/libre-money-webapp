<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing an Asset Appreciation/Depreciation Record" : "Adding an Asset Appreciation / Depreciation Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-asset v-model="recordAssetId"></select-asset>
          <q-input type="number" standout="bg-primary text-white" v-model="recordAmount" :label="`Amount of ${type}`" lazy-rules :rules="validators.balance">
            <template v-slot:append>
              <div class="currency-label">
                {{ recordCurrencySign }}
              </div>
            </template>
          </q-input>

          <q-tabs v-model="type" inline-label class="bg-grey text-white shadow-2 std-margin-bottom-32">
            <q-tab name="appreciation" label="Appreciation" />
            <q-tab name="depreciation" label="Depreciation" />
          </q-tabs>

          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input type="textarea" standout="bg-primary text-white" v-model="recordNotes" label="Notes" lazy-rules :rules="validators.notes" />
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
import { Record } from "src/schemas/record";
import { entityService } from "src/services/entity-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { asAmount } from "src/utils/de-facto-utils";
import { validators } from "src/utils/validators";
import { onMounted, ref, watch } from "vue";
import SelectAsset from "./SelectAsset.vue";
import SelectTag from "./SelectTag.vue";
import DateTimeInput from "./lib/DateTimeInput.vue";

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

const type = ref<string>("appreciation");
const recordType = RecordType.ASSET_APPRECIATION_DEPRECIATION;

const recordCurrencySign = ref<string | null>(null);
const recordAssetId = ref<string | null>(null);
const recordAmount = ref<number>(0);
const recordCurrencyId = ref<string | null>(null);

const recordTagIdList = ref<string[]>([]);
const recordNotes = ref<string | null>(null);

const transactionEpoch = ref<number>(Date.now());

// Load existing record if editing
onMounted(async () => {
  if (props.existingRecordId) {
    isLoading.value = true;
    let res = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
    initialDoc = res;
    if (!initialDoc.assetAppreciationDepreciation) {
      // TODO show error message
      isLoading.value = false;
      return;
    }

    recordAssetId.value = initialDoc.assetAppreciationDepreciation.assetId;
    recordAmount.value = asAmount(initialDoc.assetAppreciationDepreciation.amount);

    recordCurrencyId.value = initialDoc.assetAppreciationDepreciation.currencyId;

    recordTagIdList.value = initialDoc.tagIdList;
    recordNotes.value = initialDoc.notes;

    type.value = initialDoc.assetAppreciationDepreciation?.type;

    transactionEpoch.value = initialDoc.transactionEpoch || Date.now();

    isLoading.value = false;
  } else if (props.existingAssetId) {
    setTimeout(() => {
      recordAssetId.value = props.existingAssetId!;
    }, 10);
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
    assetAppreciationDepreciation: {
      assetId: recordAssetId.value!,
      amount: asAmount(recordAmount.value),
      currencyId: recordCurrencyId.value!,
      type: type.value!,
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
</script>
<style scoped lang="scss"></style>
