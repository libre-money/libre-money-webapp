<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingWalletId ? "Editing a Wallet" : "Adding a Wallet" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="walletForm">
          <q-input filled v-model="walletName" label="Name of the Wallet" lazy-rules :rules="validators.name" />
          <q-select filled v-model="walletType" :options="walletTypeList" label="Type" emit-value map-options
            class="std-margin-bottom-32 std-margin-top-12" />
          <select-currency v-model="walletCurrencyId"></select-currency>
          <q-toggle class="std-toggle" v-model="shouldShowAdvancedOptions" color="green" label="Show advanced options"
            left-label v-if="existingWalletId" />
          <q-input type="number" filled v-model="walletInitialBalance" label="Initial Balance" lazy-rules
            :rules="validators.balance" v-if="!existingWalletId || shouldShowAdvancedOptions" />
          <q-input type="number" filled v-model="walletMinimumBalance" label="Minimum Balance" lazy-rules
            :rules="validators.balanceOptional" v-if="!existingWalletId || shouldShowAdvancedOptions" />
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
import { Collection, defaultWalletType, walletTypeList } from "src/constants/constants";
import { Wallet } from "src/models/wallet";
import { pouchdbService } from "src/services/pouchdb-service";
import { Party } from "src/models/party";
import SelectCurrency from "./SelectCurrency.vue";

export default {
  props: {
    existingWalletId: {
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
    let initialDoc: Wallet | null = null;

    const isLoading = ref(false);

    const shouldShowAdvancedOptions = ref(false);

    const walletForm: Ref<QForm | null> = ref(null);

    const walletName: Ref<string | null> = ref(null);
    const walletType: Ref<string | null> = ref(walletTypeList.find((walletType) => walletType.value === defaultWalletType)!.value);
    const walletInitialBalance: Ref<number | null> = ref(null);
    const walletCurrencyId: Ref<string | null> = ref(null);
    const walletMinimumBalance: Ref<number | undefined> = ref(undefined);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    if (props.existingWalletId) {
      isLoading.value = true;
      (async function () {
        let res = (await pouchdbService.getDocById(props.existingWalletId)) as Wallet;
        initialDoc = res;
        walletName.value = res.name;
        walletType.value = res.type;
        walletInitialBalance.value = res.initialBalance;
        walletCurrencyId.value = res.currencyId;
        walletMinimumBalance.value = res.minimumBalance || undefined;
        isLoading.value = false;
      })();
    }
    async function okClicked() {
      if (!(await walletForm.value?.validate())) {
        return;
      }

      let wallet: Wallet = {
        $collection: Collection.WALLET,
        name: walletName.value!,
        type: walletType.value!,
        initialBalance: walletInitialBalance.value!,
        currencyId: walletCurrencyId.value!,
        minimumBalance: walletMinimumBalance.value
      };

      if (initialDoc) {
        wallet = Object.assign({}, initialDoc, wallet);
      }

      pouchdbService.upsertDoc(wallet);

      onDialogOK();
    }

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      walletTypeList,
      walletName,
      walletType,
      walletInitialBalance,
      walletCurrencyId,
      validators,
      walletForm,
      walletMinimumBalance,
      shouldShowAdvancedOptions
    };
  },
};
</script>
<style scoped lang="scss"></style>
