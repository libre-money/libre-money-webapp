<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingAssetId ? "Editing an Asset" : "Adding an Asset" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="assetForm">
          <q-input filled v-model="assetName" label="Name of the Asset" lazy-rules :rules="validators.name" />
          <q-select filled v-model="assetType" :options="assetTypeList" label="Type" emit-value map-options class="std-margin-bottom-32" />
          <q-select filled v-model="assetLiquidity" :options="assetLiquidityList" label="Liquidity" emit-value map-options class="std-margin-bottom-32" />
          <select-currency v-model="assetCurrencyId"></select-currency>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <q-btn color="primary" label="OK" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { Ref, ref } from "vue";
import { validators } from "src/utils/validators";
import { Collection, defaultAssetType, assetTypeList, assetLiquidityList, defaultAssetLiquidity } from "src/constants/constants";
import { Asset } from "src/models/asset";
import { pouchdbService } from "src/services/pouchdb-service";
import { Party } from "src/models/party";
import SelectCurrency from "./SelectCurrency.vue";

export default {
  props: {
    existingAssetId: {
      type: String,
      required: false,
      default: null,
    },
  },

  components: {
    SelectCurrency,
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    let initialDoc: Asset | null = null;

    const isLoading = ref(false);

    const assetForm: Ref<QForm | null> = ref(null);

    const assetName: Ref<string | null> = ref(null);
    const assetType: Ref<string | null> = ref(assetTypeList.find((assetType) => assetType.value === defaultAssetType)!.value);
    const assetLiquidity: Ref<string | null> = ref(assetLiquidityList.find((assetLiquidity) => assetLiquidity.value === defaultAssetLiquidity)!.value);

    const assetCurrencyId: Ref<string | null> = ref(null);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    if (props.existingAssetId) {
      isLoading.value = true;
      (async function () {
        let res = (await pouchdbService.getDocById(props.existingAssetId)) as Asset;
        initialDoc = res;
        assetName.value = res.name;
        assetType.value = res.type;
        assetLiquidity.value = res.liquidity;
        assetCurrencyId.value = res.currencyId;
        isLoading.value = false;
      })();
    }
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
      };

      if (initialDoc) {
        asset = Object.assign({}, initialDoc, asset);
      }

      pouchdbService.upsertDoc(asset);

      onDialogOK();
    }

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      assetTypeList,
      assetName,
      assetType,
      assetLiquidity,
      assetCurrencyId,
      validators,
      assetForm,
      assetLiquidityList,
    };
  },
};
</script>
<style scoped lang="ts"></style>
