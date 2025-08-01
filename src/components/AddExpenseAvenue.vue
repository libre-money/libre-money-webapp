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

<script setup lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { ref, onMounted } from "vue";
import { validators } from "src/utils/validators";
import { ExpenseAvenue } from "src/models/expense-avenue";
import { pouchdbService } from "src/services/pouchdb-service";
import { Collection } from "src/constants/constants";

const props = defineProps<{
  existingExpenseAvenueId?: string | null;
}>();

const emit = defineEmits([...useDialogPluginComponent.emits]);

let initialDoc: ExpenseAvenue | null = null;

const isLoading = ref(false);
const expenseAvenueForm = ref<QForm | null>(null);
const expenseAvenueName = ref<string | null>(null);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

onMounted(async () => {
  if (props.existingExpenseAvenueId) {
    isLoading.value = true;
    const res = (await pouchdbService.getDocById(props.existingExpenseAvenueId)) as ExpenseAvenue;
    initialDoc = res;
    expenseAvenueName.value = res.name;
    isLoading.value = false;
  }
});

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

const cancelClicked = onDialogCancel;
</script>
<style scoped lang="scss"></style>
