<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingTagId ? "Editing a Tag" : "Adding a Tag" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="tagForm">
          <q-input filled v-model="tagName" label="Name of the Tag" lazy-rules :rules="validators.name" />

          <q-input filled v-model="tagColor" class="color-input">
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
import { Tag } from "src/models/tag";
import { pouchdbService } from "src/services/pouchdb-service";
import { Collection, defaultTagColor } from "src/constants/constants";

export default {
  props: {
    existingTagId: {
      type: String,
      required: false,
      default: null,
    },
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    let initialDoc: Tag | null = null;

    const isLoading = ref(false);

    const tagForm: Ref<QForm | null> = ref(null);

    const tagName: Ref<string | null> = ref(null);
    const tagColor: Ref<string | null> = ref(null);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    if (props.existingTagId) {
      isLoading.value = true;
      (async function () {
        let res = (await pouchdbService.getDocById(props.existingTagId)) as Tag;
        initialDoc = res;
        tagName.value = res.name;
        tagColor.value = res.color || defaultTagColor;
        isLoading.value = false;
      })();
    }
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

      pouchdbService.upsertDoc(tag);

      onDialogOK();
    }

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      tagName,
      validators,
      tagForm,
      tagColor,
    };
  },
};
</script>
<style scoped lang="ts"></style>
