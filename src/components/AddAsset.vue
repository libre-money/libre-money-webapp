<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingAssetId ? "Editing an Asset" : "Adding an Asset" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="assetForm">
          <q-input filled v-model="assetName" label="Name of the Asset" lazy-rules :rules="validators.name" />
          <q-select filled v-model="assetType" :options="assetTypeList" label="Type" emit-value map-options class="std-margin-bottom-32 std-margin-top-12" />
          <q-select filled v-model="assetLiquidity" :options="assetLiquidityList" label="Liquidity" emit-value map-options class="std-margin-bottom-32" />
          <select-currency v-model="assetCurrencyId"></select-currency>
          <q-toggle class="std-toggle" v-model="shouldShowAdvancedOptions" color="green" label="Show advanced options" left-label v-if="existingAssetId" />
          <q-input
            type="number"
            filled
            v-model="assetInitialBalance"
            label="Initial Balance"
            lazy-rules
            :rules="validators.balance"
            v-if="!existingAssetId || shouldShowAdvancedOptions"
          />
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
import { assetLiquidityList, assetTypeList, Collection, defaultAssetLiquidity, defaultAssetType } from "src/constants/constants";
import { Asset } from "src/models/asset";
import { pouchdbService } from "src/services/pouchdb-service";
import { validators } from "src/utils/validators";
import { onMounted, ref, Ref } from "vue";
import SelectCurrency from "./SelectCurrency.vue";

// Props
const props = defineProps<{
  existingAssetId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// State
let initialDoc: Asset | null = null;

const isLoading = ref(false);
const shouldShowAdvancedOptions = ref(false);

const assetForm: Ref<QForm | null> = ref(null);

const assetName: Ref<string | null> = ref(null);
const assetType: Ref<string | null> = ref(assetTypeList.find((assetType) => assetType.value === defaultAssetType)!.value);
const assetLiquidity: Ref<string | null> = ref(assetLiquidityList.find((assetLiquidity) => assetLiquidity.value === defaultAssetLiquidity)!.value);
const assetInitialBalance: Ref<number | null> = ref(null);

const assetCurrencyId: Ref<string | null> = ref(null);

// Load existing asset if editing
onMounted(async () => {
  if (props.existingAssetId) {
    isLoading.value = true;
    const res = (await pouchdbService.getDocById(props.existingAssetId)) as Asset;
    initialDoc = res;
    assetName.value = res.name;
    assetType.value = res.type;
    assetLiquidity.value = res.liquidity;
    assetCurrencyId.value = res.currencyId;
    assetInitialBalance.value = res.initialBalance || 0;
    isLoading.value = false;
  }
});

async function okClicked() {
  if (!(await assetForm.value?.validate())) {
    return;
  }

  let asset: Asset = {
    $collection: Collection.ASSET,
    name: assetName.value!,
    type: assetType.value!,
    liquidity: assetLiquidity.value!,
    currencyId: assetCurrencyId.value!,
    initialBalance: assetInitialBalance.value || 0,
  };

  if (initialDoc) {
    asset = Object.assign({}, initialDoc, asset);
  }

  pouchdbService.upsertDoc(asset);

  onDialogOK();
}

const cancelClicked = onDialogCancel;
</script>
<style scoped lang="scss"></style>
