<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss full-width full-height>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingDocumentId ? "Editing a Document" : "Adding a Document" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="documentForm">
          <q-input
            class="content-input"
            type="textarea"
            standout="bg-primary text-white"
            v-model="contentString"
            label="Content"
            lazy-rules
            :rules="validators.document"
            style="font-family: 'Courier New', Courier, monospace"
            input-style="min-height: 50vh"
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
import { pouchdbService } from "src/services/pouchdb-service";
import { validators } from "src/utils/validators";
import { onMounted, ref } from "vue";

// Props
const props = defineProps<{
  existingDocumentId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// State
const isLoading = ref(false);
const documentForm = ref<QForm | null>(null);
const contentString = ref<string | null>(null);

// Load existing document if editing
onMounted(async () => {
  if (props.existingDocumentId) {
    isLoading.value = true;
    try {
      const res = await pouchdbService.getDocById(props.existingDocumentId);
      const initialDoc = JSON.stringify(res);
      contentString.value = initialDoc;
    } finally {
      isLoading.value = false;
    }
  }
});

// Methods
async function okClicked() {
  if (!(await documentForm.value?.validate())) {
    return;
  }

  let document;
  try {
    document = JSON.parse(contentString.value || "{}");
  } catch (ex) {
    console.error(ex);
    // TODO alert dialog
    return;
  }

  pouchdbService.upsertDoc(document);

  onDialogOK();
}

const cancelClicked = onDialogCancel;
</script>
<style scoped lang="scss"></style>
