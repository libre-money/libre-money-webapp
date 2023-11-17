<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingCurrencyId ? "Editing a Currency" : "Adding a Currency" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="currencyForm">
          <q-input filled v-model="currencyName" label="Name of the Currency" lazy-rules :rules="validators.name" />
          <q-input filled v-model="currencySign" label="Currency Sign (i.e. USD)" lazy-rules :rules="validators.currencySign" />
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
import { Collection } from "src/constants/constants";
import { Currency } from "src/models/currency";
import { pouchdbService } from "src/services/pouchdb-service";

export default {
  props: {
    existingCurrencyId: {
      type: String,
      required: false,
      default: null,
    },
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    let initialDoc: Currency | null = null;

    const isLoading = ref(false);

    const currencyForm: Ref<QForm | null> = ref(null);

    const currencyName: Ref<string | null> = ref(null);
    const currencySign: Ref<string | null> = ref(null);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    if (props.existingCurrencyId) {
      isLoading.value = true;
      (async function () {
        let res = (await pouchdbService.getDocById(props.existingCurrencyId)) as Currency;
        initialDoc = res;
        currencyName.value = res.name;
        currencySign.value = res.sign;
        isLoading.value = false;
      })();
    }
    async function okClicked() {
      if (!(await currencyForm.value?.validate())) {
        return;
      }

      let currency: Currency = {
        $collection: Collection.CURRENCY,
        name: currencyName.value!,
        sign: currencySign.value!,
      };

      if (initialDoc) {
        currency = Object.assign({}, initialDoc, currency);
      }

      pouchdbService.upsertDoc(currency);

      onDialogOK();
    }

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      currencyName,
      currencySign,
      validators,
      currencyForm,
    };
  },
};
</script>
<style scoped lang="ts"></style>
