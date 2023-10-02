<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing an Asset Appreciation/Depreciation Record" : "Adding an Asset Appreciation/Depreciation Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-asset v-model="recordAssetId"></select-asset>
          <q-input type="number" filled v-model="recordAmount" :label="`Amount of ${type}`" lazy-rules :rules="validators.balance">
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
          <q-input type="textarea" filled v-model="recordNotes" label="Notes" lazy-rules :rules="validators.notes" />
          <date-time-input v-model="transactionEpoch" label="Date & Time"></date-time-input>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="primary" label="OK" @click="okClicked" />
        <q-btn color="primary" label="Cancel" @click="cancelClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { Ref, ref, watch } from "vue";
import { validators } from "src/utils/validators";
import { Collection, RecordType } from "src/constants/constants";
import { Record } from "src/models/record";
import { pouchdbService } from "src/services/pouchdb-service";
import SelectCurrency from "./SelectCurrency.vue";
import SelectAsset from "./SelectAsset.vue";
import SelectWallet from "./SelectWallet.vue";
import SelectParty from "./SelectParty.vue";
import SelectTag from "./SelectTag.vue";
import { dialogService } from "src/services/dialog-service";
import { asAmount } from "src/utils/misc-utils";
import DateTimeInput from "./lib/DateTimeInput.vue";
import { dataInferenceService } from "src/services/data-inference-service";

export default {
  props: {
    existingRecordId: {
      type: String,
      required: false,
      default: null,
    },
    existingAssetId: {
      type: String,
      required: false,
      default: null,
    },
  },

  components: {
    SelectAsset,
    SelectTag,
    DateTimeInput,
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    let initialDoc: Record | null = null;
    const isLoading = ref(false);

    const recordForm: Ref<QForm | null> = ref(null);

    const type: Ref<string | null> = ref("appreciation");
    const recordType = RecordType.ASSET_APPRECIATION_DEPRECIATION;

    const recordCurrencySign: Ref<string | null> = ref(null);
    const recordAssetId: Ref<string | null> = ref(null);
    const recordAmount: Ref<number> = ref(0);
    const recordCurrencyId: Ref<string | null> = ref(null);

    const recordTagIdList: Ref<string[]> = ref([]);
    const recordNotes: Ref<string | null> = ref(null);

    const transactionEpoch: Ref<number> = ref(Date.now());

    if (props.existingRecordId) {
      isLoading.value = true;
      (async function () {
        isLoading.value = true;
        let res = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
        initialDoc = res;
        if (!initialDoc.assetAppreciationDepreciation) {
          // TODO show error message
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
      })();
    } else {
      if (props.existingAssetId) {
        setTimeout(() => {
          recordAssetId.value = props.existingAssetId;
        }, 10);
      }
    }

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

    watch(recordAssetId, async (newAssetId: any) => {
      let asset = await dataInferenceService.getAsset(newAssetId);
      let currency = await dataInferenceService.getCurrency(asset.currencyId);
      recordCurrencyId.value = currency._id!;
      recordCurrencySign.value = currency.sign;
    });

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      validators,
      transactionEpoch,
      recordForm,
      type,
      recordAssetId,
      recordAmount,
      recordCurrencyId,
      recordTagIdList,
      recordNotes,
      recordCurrencySign,
    };
  },
};
</script>
<style scoped lang="ts"></style>
