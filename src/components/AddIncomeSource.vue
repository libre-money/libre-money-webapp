<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingIncomeSourceId ? "Editing an Income Source" : "Adding an Income Source" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="incomeSourceForm">
          <q-input standout="bg-primary text-white" v-model="incomeSourceName" label="Name" lazy-rules :rules="validators.name" />
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
import { Collection } from "src/constants/constants";
import { IncomeSource } from "src/models/income-source";
import { pouchdbService } from "src/services/pouchdb-service";
import { validators } from "src/utils/validators";
import { onMounted, ref } from "vue";

// Props
const props = defineProps<{
  existingIncomeSourceId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// State
let initialDoc: IncomeSource | null = null;
const isLoading = ref(false);
const incomeSourceForm = ref<QForm | null>(null);
const incomeSourceName = ref<string | null>(null);

// Load existing income source if editing
onMounted(async () => {
  if (props.existingIncomeSourceId) {
    isLoading.value = true;
    const res = (await pouchdbService.getDocById(props.existingIncomeSourceId)) as IncomeSource;
    initialDoc = res;
    incomeSourceName.value = res.name;
    isLoading.value = false;
  }
});

async function okClicked() {
  if (!(await incomeSourceForm.value?.validate())) {
    return;
  }

  let incomeSource: IncomeSource = {
    $collection: Collection.INCOME_SOURCE,
    name: incomeSourceName.value!,
  };

  if (initialDoc) {
    incomeSource = Object.assign({}, initialDoc, incomeSource);
  }

  pouchdbService.upsertDoc(incomeSource);

  onDialogOK();
}

// Cancel
const cancelClicked = onDialogCancel;
</script>
<style scoped lang="scss"></style>
