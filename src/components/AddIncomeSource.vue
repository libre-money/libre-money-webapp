<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingIncomeSourceId ? "Editing an Income Source" : "Adding an Income Source" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="incomeSourceForm">
          <q-input filled v-model="incomeSourceName" label="Name" lazy-rules :rules="validators.name" />
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
import { IncomeSource } from "src/models/income-source";
import { pouchdbService } from "src/services/pouchdb-service";
import { Collection } from "src/constants/constants";

export default {
  props: {
    existingIncomeSourceId: {
      type: String,
      required: false,
      default: null,
    },
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    let initialDoc: IncomeSource | null = null;

    const isLoading = ref(false);

    const incomeSourceForm: Ref<QForm | null> = ref(null);

    const incomeSourceName: Ref<string | null> = ref(null);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    if (props.existingIncomeSourceId) {
      isLoading.value = true;
      (async function () {
        let res = (await pouchdbService.getDocById(props.existingIncomeSourceId)) as IncomeSource;
        initialDoc = res;
        incomeSourceName.value = res.name;
        isLoading.value = false;
      })();
    }
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

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      incomeSourceName,
      validators,
      incomeSourceForm,
    };
  },
};
</script>
<style scoped lang="ts"></style>
