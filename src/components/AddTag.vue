<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingTagId ? "Editing a Tag" : "Adding a Tag" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="tagForm">
          <q-input standout="bg-primary text-white" v-model="tagName" label="Name of the Tag" lazy-rules :rules="validators.name" />

          <q-input standout="bg-primary text-white" v-model="tagColor" class="color-input">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-color v-model="tagColor" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" flat label="Cancel" @click="cancelClicked" />
        <q-btn color="primary" label="OK" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { Collection, defaultTagColor } from "src/constants/constants";
import { Tag } from "src/models/tag";
import { pouchdbService } from "src/services/pouchdb-service";
import { validators } from "src/utils/validators";
import { onMounted, ref } from "vue";

// Props
const props = defineProps<{
  existingTagId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// State
let initialDoc: Tag | null = null;
const isLoading = ref(false);
const tagForm = ref<QForm | null>(null);
const tagName = ref<string | null>(null);
const tagColor = ref<string | null>(null);

// Load existing tag if editing
onMounted(async () => {
  if (props.existingTagId) {
    isLoading.value = true;
    const res = (await pouchdbService.getDocById(props.existingTagId)) as Tag;
    initialDoc = res;
    tagName.value = res.name;
    tagColor.value = res.color || defaultTagColor;
    isLoading.value = false;
  }
});

async function okClicked() {
  if (!(await tagForm.value?.validate())) {
    return;
  }

  let tag: Tag = {
    $collection: Collection.TAG,
    name: tagName.value!,
    color: tagColor.value!,
  };

  if (initialDoc) {
    tag = Object.assign({}, initialDoc, tag);
  }

  await pouchdbService.upsertDoc(tag);

  onDialogOK();
}

function cancelClicked() {
  onDialogCancel();
}
</script>
<style scoped lang="scss"></style>
