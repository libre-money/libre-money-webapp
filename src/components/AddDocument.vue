<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent full-width full-height>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingDocumentId ? "Editing a Document" : "Adding a Document" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="documentForm">
          <q-input
            class="content-input"
            type="textarea"
            filled
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
        <q-btn color="primary" label="OK" @click="okClicked" />
        <q-btn color="primary" label="Cancel" @click="cancelClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { Ref, ref } from "vue";
import { validators } from "src/utils/validators";
import { Collection } from "src/constants/constants";
import { pouchdbService } from "src/services/pouchdb-service";
import { Party } from "src/models/party";
import SelectCurrency from "./SelectCurrency.vue";

export default {
  props: {
    existingDocumentId: {
      type: String,
      required: false,
      default: null,
    },
  },

  components: {},

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    let initialDoc: string | null = null;

    const isLoading = ref(false);

    const documentForm: Ref<QForm | null> = ref(null);
    const contentString: Ref<string | null> = ref(null);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    if (props.existingDocumentId) {
      isLoading.value = true;
      (async function () {
        let res = await pouchdbService.getDocById(props.existingDocumentId);
        initialDoc = JSON.stringify(res);
        contentString.value = initialDoc;
        isLoading.value = false;
      })();
    }
    async function okClicked() {
      if (!(await documentForm.value?.validate())) {
        return;
      }

      let document = "";
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

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      validators,
      documentForm,
      contentString,
    };
  },
};
</script>
<style scoped lang="scss"></style>
