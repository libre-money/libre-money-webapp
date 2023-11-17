<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingExpenseAvenueId ? "Editing an Expense Avenue" : "Adding an Expense Avenue" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="expenseAvenueForm">
          <q-input filled v-model="expenseAvenueName" label="Name" lazy-rules :rules="validators.name" />
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
import { ExpenseAvenue } from "src/models/expense-avenue";
import { pouchdbService } from "src/services/pouchdb-service";
import { Collection } from "src/constants/constants";

export default {
  props: {
    existingExpenseAvenueId: {
      type: String,
      required: false,
      default: null,
    },
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    let initialDoc: ExpenseAvenue | null = null;

    const isLoading = ref(false);

    const expenseAvenueForm: Ref<QForm | null> = ref(null);

    const expenseAvenueName: Ref<string | null> = ref(null);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    if (props.existingExpenseAvenueId) {
      isLoading.value = true;
      (async function () {
        let res = (await pouchdbService.getDocById(props.existingExpenseAvenueId)) as ExpenseAvenue;
        initialDoc = res;
        expenseAvenueName.value = res.name;
        isLoading.value = false;
      })();
    }
    async function okClicked() {
      if (!(await expenseAvenueForm.value?.validate())) {
        return;
      }

      let expenseAvenue: ExpenseAvenue = {
        $collection: Collection.EXPENSE_AVENUE,
        name: expenseAvenueName.value!,
      };

      if (initialDoc) {
        expenseAvenue = Object.assign({}, initialDoc, expenseAvenue);
      }

      pouchdbService.upsertDoc(expenseAvenue);

      onDialogOK();
    }

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      expenseAvenueName,
      validators,
      expenseAvenueForm,
    };
  },
};
</script>
<style scoped lang="ts"></style>
