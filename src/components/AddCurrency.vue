<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingCurrencyId ? "Editing a Currency" : "Adding a Currency" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="currencyForm">
          <q-input standout="bg-primary text-white" v-model="currencyName" label="Name of the Currency" lazy-rules :rules="validators.name" />
          <q-input standout="bg-primary text-white" v-model="currencySign" label="Currency Sign (i.e. USD)" lazy-rules :rules="validators.currencySign" />
          <q-input
            standout="bg-primary text-white"
            v-model="precisionMinimum"
            label="Minimum Precision"
            lazy-rules
            :rules="validators.nonNegativeNumber"
            type="number"
          />
          <q-input
            standout="bg-primary text-white"
            v-model="precisionMaximum"
            label="Maximum Precision"
            lazy-rules
            :rules="validators.nonNegativeNumber"
            type="number"
          />
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn flat label="Cancel" @click="cancelClicked" />
        <q-btn color="primary" label="OK" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { Collection } from "src/constants/constants";
import { Currency } from "src/schemas/currency";
import { pouchdbService } from "src/services/pouchdb-service";
import { validators } from "src/utils/validators";
import { ref } from "vue";

const props = defineProps<{
  existingCurrencyId?: string | null;
}>();

const emit = defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const isLoading = ref(false);

const currencyForm = ref<QForm | null>(null);

const currencyName = ref<string | null>(null);
const currencySign = ref<string | null>(null);
const precisionMinimum = ref<number | null>(null);
const precisionMaximum = ref<number | null>(null);

let initialDoc: Currency | null = null;

const loadCurrency = async (id: string) => {
  isLoading.value = true;
  const res = (await pouchdbService.getDocById(id)) as Currency;
  initialDoc = res;
  currencyName.value = res.name;
  currencySign.value = res.sign;
  precisionMinimum.value = res.precisionMinimum || 0;
  precisionMaximum.value = res.precisionMaximum || 0;
  isLoading.value = false;
};

if (props.existingCurrencyId) {
  loadCurrency(props.existingCurrencyId);
}

async function okClicked() {
  if (!(await currencyForm.value?.validate())) {
    return;
  }

  let currency: Currency = {
    $collection: Collection.CURRENCY,
    name: currencyName.value!,
    sign: currencySign.value!,
    precisionMinimum: precisionMinimum.value!,
    precisionMaximum: precisionMaximum.value!,
  };

  if (initialDoc) {
    currency = Object.assign({}, initialDoc, currency);
  }

  pouchdbService.upsertDoc(currency);

  onDialogOK();
}

const cancelClicked = onDialogCancel;
</script>
<style scoped lang="scss"></style>
