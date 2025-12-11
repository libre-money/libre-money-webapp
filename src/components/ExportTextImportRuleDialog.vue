<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin" style="max-width: 500px">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">Export Rule as Code</div>
        <div class="q-pa-md">
          <div class="text-subtitle2 q-mb-md">Copy the JSON code below:</div>
          <q-input
            standout="bg-primary text-white"
            type="textarea"
            v-model="exportedCode"
            label="Rule JSON Code"
            readonly
            autogrow
            class="q-mb-md"
            style="font-family: monospace"
          />
          <div class="row justify-end q-gutter-sm">
            <q-btn color="primary" icon="content_copy" label="Copy to Clipboard" @click="copyToClipboard" />
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Close" @click="onDialogCancel" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar";
import { TextImportRules } from "src/models/text-import-rules";
import { computed } from "vue";

// Props
const props = defineProps<{
  rule: Partial<TextImportRules>;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent();
const $q = useQuasar();

// Create clean export data (remove internal fields)
function createExportData(rule: Partial<TextImportRules>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, _rev, $collection, ...exportData } = rule;
  return exportData;
}

const exportedCode = computed(() => JSON.stringify(createExportData(props.rule), null, 2));

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(exportedCode.value);
    $q.notify({
      type: "positive",
      message: "Rule code copied to clipboard!",
      position: "top",
    });
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    $q.notify({
      type: "negative",
      message: "Failed to copy to clipboard",
      position: "top",
    });
  }
}
</script>

<style scoped lang="scss"></style>
