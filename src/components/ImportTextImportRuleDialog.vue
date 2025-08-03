<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin" style="max-width: 500px">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">Import Rule from Code</div>
        <q-form class="q-gutter-md q-pa-md" ref="importForm">
          <div class="text-subtitle2 q-mb-md">Paste the JSON code below:</div>
          <q-input
            filled
            type="textarea"
            v-model="importCode"
            label="Rule JSON Code"
            lazy-rules
            :rules="[validateJson]"
            autogrow
            class="q-mb-md"
            style="font-family: monospace"
            placeholder="Paste your rule JSON here..."
          />

          <div v-if="validationErrors.length > 0" class="q-mt-md">
            <div class="text-negative text-subtitle2">Validation Errors:</div>
            <q-list bordered separator>
              <q-item v-for="error in validationErrors" :key="error" dense>
                <q-item-section>
                  <q-item-label class="text-negative">{{ error }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <div v-if="previewData" class="q-mt-md">
            <div class="text-positive text-subtitle2">Preview:</div>
            <q-list bordered separator>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Name</q-item-label>
                  <q-item-label>{{ previewData.name }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Description</q-item-label>
                  <q-item-label>{{ previewData.description }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Wallet Rules</q-item-label>
                  <q-item-label>{{ previewData.walletMatchRules?.length || 0 }} rule(s)</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Expense Avenue Rules</q-item-label>
                  <q-item-label>{{ previewData.expenseAvenueMatchRules?.length || 0 }} rule(s)</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Cancel" @click="onDialogCancel" />
        <q-btn color="primary" label="Import" @click="importClicked" :disable="validationErrors.length > 0 || !previewData" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar";
import { TextImportRules, TextImportRulesValidator } from "src/models/text-import-rules";
import { ref } from "vue";

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
const $q = useQuasar();

const importCode = ref("");
const validationErrors = ref<string[]>([]);
const previewData = ref<Partial<TextImportRules> | null>(null);

function validateJson(val: string) {
  if (!val.trim()) {
    validationErrors.value = ["JSON code is required"];
    previewData.value = null;
    return "JSON code is required";
  }

  try {
    const parsed = JSON.parse(val);
    const validation = TextImportRulesValidator.validate(parsed);
    validationErrors.value = validation.errors;

    if (validation.isValid) {
      previewData.value = parsed;
      return true;
    } else {
      previewData.value = null;
      return "Invalid rule configuration";
    }
  } catch (e) {
    validationErrors.value = ["Invalid JSON format"];
    previewData.value = null;
    return "Invalid JSON format";
  }
}

function importClicked() {
  if (validationErrors.value.length === 0 && previewData.value) {
    onDialogOK(previewData.value);
  } else {
    $q.notify({
      type: "negative",
      message: "Please fix validation errors before importing",
    });
  }
}
</script>

<style scoped lang="scss"></style>
