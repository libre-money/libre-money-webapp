<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingRecordId ? "Editing an Asset Purchase Record" : "Adding an Asset Purchase Record" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="recordForm">
          <select-asset v-model="recordAssetId"></select-asset>
          <q-input type="number" filled v-model="recordAmount" label="Price of the Asset" lazy-rules
            :rules="validators.balance">
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

          <select-wallet v-model="recordWalletId" :limitByCurrencyId="recordCurrencyId"
            v-if="paymentType == 'full' || paymentType == 'partial'"></select-wallet>
          <q-input type="number" filled v-model="recordAmountPaid" label="Amount Paid" lazy-rules
            :rules="validators.balance" v-if="paymentType == 'partial'" />
          <div v-if="paymentType == 'partial'">Amount remaining: {{ recordAmountUnpaid }}</div>

          <select-party v-model="recordPartyId"
            :mandatory="paymentType == 'unpaid' || paymentType == 'partial'"></select-party>
          <select-tag v-model="recordTagIdList"></select-tag>
          <q-input type="textarea" filled v-model="recordNotes" label="Notes" lazy-rules :rules="validators.notes" />
          <date-time-input v-model="transactionEpoch" label="Date & Time"></date-time-input>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-start std-bottom-action-row">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <div class="spacer"></div>
        <q-btn-dropdown size="md" color="primary" label="Save" split @click="okClicked" style="margin-left: 8px;">
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
import { NotificationType, dialogService } from "src/services/dialog-service";
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
    useTemplateId: {
      type: String,
      required: false,
      default: null,
    },
  },

  components: {
    SelectAsset,
    SelectWallet,
    SelectParty,
    SelectTag,
    DateTimeInput,
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    let initialDoc: Record | null = null;
    const isLoading = ref(false);

    const recordForm: Ref<QForm | null> = ref(null);

    const paymentType: Ref<string | null> = ref("full");
    const recordType = RecordType.ASSET_PURCHASE;

    const recordCurrencySign: Ref<string | null> = ref(null);
    const recordAssetId: Ref<string | null> = ref(null);
    const recordAmount: Ref<number> = ref(0);
    const recordCurrencyId: Ref<string | null> = ref(null);
    const recordPartyId: Ref<string | null> = ref(null);
    const recordWalletId: Ref<string | null> = ref(null);
    const recordAmountPaid: Ref<number> = ref(0);
    const recordAmountUnpaid: Ref<number> = ref(0);
    const recordTagIdList: Ref<string[]> = ref([]);
    const recordNotes: Ref<string | null> = ref(null);

    const transactionEpoch: Ref<number> = ref(Date.now());

    async function prefillRecord(prefilledRecord: Record): Promise<boolean> {
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

    if (props.existingRecordId) {
      isLoading.value = true;
      (async function () {
        isLoading.value = true;
        initialDoc = (await pouchdbService.getDocById(props.existingRecordId)) as Record;
        if (!await prefillRecord(initialDoc)) return;
        transactionEpoch.value = initialDoc.transactionEpoch || Date.now();
        isLoading.value = false;
      })();
    } else if (props.useTemplateId) {
      isLoading.value = true;
      (async function () {
        isLoading.value = true;
        let templateDoc = (await pouchdbService.getDocById(props.useTemplateId)) as Record;
        if (!await prefillRecord(templateDoc)) return;
        transactionEpoch.value = Date.now();
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

      recordAmountUnpaid.value = recordAmount.value - recordAmountPaid.value;

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

      if (initialDoc) {
        record = Object.assign({}, initialDoc, record);
      }

      console.debug("Saving record: ", JSON.stringify(record, null, 2));

      pouchdbService.upsertDoc(record);

      onDialogOK();
    }

    async function saveAsTemplateClicked() {
      let templateName = await dialogService.prompt("Saving as template", "Provide a unique name for the template", "");
      if (!templateName) return;
      let partialRecord: Record = {
        $collection: Collection.RECORD_TEMPLATE,
        templateName,
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
      pouchdbService.upsertDoc(partialRecord);
      dialogService.notify(NotificationType.SUCCESS, "Template saved.");
      onDialogCancel();
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
      paymentType,
      recordAssetId,
      recordAmount,
      recordCurrencyId,
      recordPartyId,
      recordWalletId,
      recordAmountPaid,
      recordAmountUnpaid,
      recordTagIdList,
      recordNotes,
      recordCurrencySign,
      saveAsTemplateClicked,
    };
  },
};
</script>
<style scoped lang="scss"></style>
