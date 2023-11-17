<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingMemoId ? "Editing an Memo" : "Adding an Memo" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="memoForm">
          <q-input filled v-model="memoName" label="Name" lazy-rules :rules="validators.name" />
          <q-input type="textarea" filled v-model="memoContent" label="Content" lazy-rules :rules="validators.document" input-style="min-height: 50vh" />
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
import { Memo } from "src/models/memo";
import { pouchdbService } from "src/services/pouchdb-service";
import { Collection } from "src/constants/constants";

export default {
  props: {
    existingMemoId: {
      type: String,
      required: false,
      default: null,
    },
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    let initialDoc: Memo | null = null;

    const isLoading = ref(false);

    const memoForm: Ref<QForm | null> = ref(null);

    const memoName: Ref<string | null> = ref(null);
    const memoContent: Ref<string | null> = ref(null);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    if (props.existingMemoId) {
      isLoading.value = true;
      (async function () {
        let res = (await pouchdbService.getDocById(props.existingMemoId)) as Memo;
        initialDoc = res;
        memoName.value = res.name;
        memoContent.value = res.content;
        isLoading.value = false;
      })();
    }
    async function okClicked() {
      if (!(await memoForm.value?.validate())) {
        return;
      }

      let memo: Memo = {
        $collection: Collection.MEMO,
        name: memoName.value!,
        content: memoContent.value!,
      };

      if (initialDoc) {
        memo = Object.assign({}, initialDoc, memo);
      }

      pouchdbService.upsertDoc(memo);

      onDialogOK();
    }

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      memoName,
      validators,
      memoForm,
      memoContent,
    };
  },
};
</script>
<style scoped lang="ts"></style>
