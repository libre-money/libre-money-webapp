<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin" style="max-width: 500px; max-height: 90vh">
      <q-card-section class="q-pa-md" style="max-height: calc(90vh - 80px); overflow-y: auto">
        <div class="text-h6 q-mb-sm">
          {{ existingRuleId ? "Edit Import Rule" : "Add Import Rule" }}
        </div>
        <q-form class="q-gutter-sm" ref="ruleForm">
          <!-- Basic Information -->
          <div class="text-subtitle1 text-primary q-mb-xs">Basic Information</div>
          <q-input standout="bg-primary text-white" v-model="ruleName" label="Rule Name" lazy-rules :rules="validators.required" dense />
          <q-input standout="bg-primary text-white" v-model="ruleDescription" label="Description" type="textarea" dense />
          <q-input standout="bg-primary text-white" v-model="ruleRegex" label="Regular Expression" lazy-rules :rules="[validateRegex]" dense />

          <!-- Capture Groups -->
          <div class="text-subtitle1 text-primary q-mb-xs q-mt-md">Capture Groups</div>
          <div class="row q-gutter-xs">
            <q-input
              filled
              v-model.number="walletCaptureGroup"
              label="Wallet Group"
              type="number"
              lazy-rules
              :rules="validators.required"
              class="col-6 col-sm-3"
              dense
            />
            <q-input
              filled
              v-model.number="expenseAvenueCaptureGroup"
              label="Expense Group"
              type="number"
              lazy-rules
              :rules="validators.required"
              class="col-6 col-sm-3"
              dense
            />
            <q-input
              filled
              v-model.number="dateCaptureGroup"
              label="Date Group"
              type="number"
              lazy-rules
              :rules="validators.required"
              class="col-6 col-sm-3"
              dense
            />
            <q-input
              filled
              v-model.number="amountCaptureGroup"
              label="Amount Group"
              type="number"
              lazy-rules
              :rules="validators.required"
              class="col-6 col-sm-3"
              dense
            />
          </div>
          <q-input standout="bg-primary text-white" v-model="dateFormat" label="Date Format" lazy-rules :rules="validators.required" dense />

          <!-- Wallet Match Rules -->
          <div class="text-subtitle1 text-primary q-mb-xs q-mt-md">Wallet Match Rules</div>
          <div v-for="(rule, index) in walletMatchRules" :key="index" class="q-pa-sm q-mb-sm" style="border: 1px solid #e0e0e0; border-radius: 4px">
            <div class="column q-gutter-xs">
              <div class="row q-gutter-xs">
                <q-select
                  standout="bg-primary text-white"
                  v-model="rule.operator"
                  :options="operatorOptions"
                  label="Operator"
                  class="col-12 col-sm-4"
                  emit-value
                  map-options
                  dense
                />
                <q-input standout="bg-primary text-white" v-model="rule.value" label="Match Value" class="col-12 col-sm-8" dense />
              </div>
              <div class="row q-gutter-xs items-center">
                <select-wallet v-model="rule.walletId" label="Target Wallet" class="col" />
                <q-btn icon="delete" color="negative" flat size="sm" @click="removeWalletRule(index)" />
              </div>
            </div>
          </div>
          <q-btn icon="add" color="primary" label="Add Wallet Rule" @click="addWalletRule" size="sm" />

          <!-- Expense Avenue Match Rules -->
          <div class="text-subtitle1 text-primary q-mb-xs q-mt-md">Expense Avenue Match Rules</div>
          <div v-for="(rule, index) in expenseAvenueMatchRules" :key="index" class="q-pa-sm q-mb-sm" style="border: 1px solid #e0e0e0; border-radius: 4px">
            <div class="column q-gutter-xs">
              <div class="row q-gutter-xs">
                q-select standout="bg-primary text-white" v-model="rule.operator" :options="operatorOptions" label="Operator" class="col-12 col-sm-4" emit-value
                map-options dense />
                <q-input standout="bg-primary text-white" v-model="rule.value" label="Match Value" class="col-12 col-sm-8" dense />
              </div>
              <div class="row q-gutter-xs items-center">
                <select-expense-avenue v-model="rule.expenseAvenueId" label="Target Expense Avenue" class="col" />
                <q-btn icon="delete" color="negative" flat size="sm" @click="removeExpenseAvenueRule(index)" />
              </div>
            </div>
          </div>
          <q-btn icon="add" color="primary" label="Add Expense Avenue Rule" @click="addExpenseAvenueRule" size="sm" />

          <q-toggle v-model="ruleIsActive" label="Active" class="q-mt-sm" />

          <div v-if="validationErrors.length > 0" class="q-mt-sm">
            <div class="text-negative text-subtitle2">Validation Errors:</div>
            <q-card flat bordered class="q-pa-sm">
              <div v-for="error in validationErrors" :key="error" class="text-negative text-body2">• {{ error }}</div>
            </q-card>
          </div>
        </q-form>
      </q-card-section>

      <q-card-actions class="column q-gutter-xs q-pa-sm">
        <div class="row justify-center q-gutter-xs">
          <q-btn color="orange" icon="code" label="Export Code" @click="exportAsCodeClicked" outline size="sm" />
          <q-btn color="purple" icon="download" label="Import Code" @click="importCodeClicked" outline size="sm" />
        </div>
        <div class="row justify-end q-gutter-xs">
          <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" size="sm" />
          <q-btn color="primary" label="Save" @click="okClicked" :disable="validationErrors.length > 0" size="sm" />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent, useQuasar } from "quasar";
import { Collection } from "src/constants/constants";
import { ExpenseAvenueMatchRule, MatchingOperator, TextImportRules, TextImportRulesValidator, WalletMatchRule } from "src/models/text-import-rules";
import { pouchdbService } from "src/services/pouchdb-service";
import { validators } from "src/utils/validators";
import { computed, onMounted, ref } from "vue";
import ExportTextImportRuleDialog from "./ExportTextImportRuleDialog.vue";
import ImportTextImportRuleDialog from "./ImportTextImportRuleDialog.vue";
import SelectExpenseAvenue from "./SelectExpenseAvenue.vue";
import SelectWallet from "./SelectWallet.vue";

const props = defineProps<{
  existingRuleId?: string | null;
}>();

// Emits
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// Quasar
const $q = useQuasar();

// State
let initialDoc: TextImportRules | null = null;

const isLoading = ref(false);
const ruleForm = ref<QForm | null>(null);
const ruleName = ref("");
const ruleDescription = ref("");
const ruleRegex = ref("");
const walletCaptureGroup = ref(1);
const expenseAvenueCaptureGroup = ref(2);
const dateCaptureGroup = ref(3);
const amountCaptureGroup = ref(4);
const dateFormat = ref("DD/MM/YYYY");
const walletMatchRules = ref<WalletMatchRule[]>([]);
const expenseAvenueMatchRules = ref<ExpenseAvenueMatchRule[]>([]);
const ruleIsActive = ref(true);

const operatorOptions = [
  { label: "Exact Match", value: "exact-match" as MatchingOperator },
  { label: "Contains", value: "contains" as MatchingOperator },
  { label: "Starts With", value: "starts-with" as MatchingOperator },
  { label: "Ends With", value: "ends-with" as MatchingOperator },
  { label: "Regex", value: "regex" as MatchingOperator },
];

// Load existing rule if editing
onMounted(async () => {
  if (props.existingRuleId) {
    isLoading.value = true;
    try {
      const res = (await pouchdbService.getDocById(props.existingRuleId)) as TextImportRules;
      initialDoc = res;

      // Populate form fields
      ruleName.value = res.name;
      ruleDescription.value = res.description || "";
      ruleRegex.value = res.regex;
      walletCaptureGroup.value = res.walletCaptureGroup;
      expenseAvenueCaptureGroup.value = res.expenseAvenueCaptureGroup;
      dateCaptureGroup.value = res.dateCaptureGroup;
      amountCaptureGroup.value = res.amountCaptureGroup;
      dateFormat.value = res.dateFormat;
      walletMatchRules.value = [...res.walletMatchRules];
      expenseAvenueMatchRules.value = [...res.expenseAvenueMatchRules];
      ruleIsActive.value = res.isActive;
    } finally {
      isLoading.value = false;
    }
  }

  // Initialize with at least one rule for each type
  if (walletMatchRules.value.length === 0) {
    addWalletRule();
  }
  if (expenseAvenueMatchRules.value.length === 0) {
    addExpenseAvenueRule();
  }
});

// Validation
const validationErrors = computed(() => {
  const rule: Partial<TextImportRules> = {
    name: ruleName.value,
    description: ruleDescription.value,
    regex: ruleRegex.value,
    walletCaptureGroup: walletCaptureGroup.value,
    expenseAvenueCaptureGroup: expenseAvenueCaptureGroup.value,
    dateCaptureGroup: dateCaptureGroup.value,
    amountCaptureGroup: amountCaptureGroup.value,
    dateFormat: dateFormat.value,
    walletMatchRules: walletMatchRules.value,
    expenseAvenueMatchRules: expenseAvenueMatchRules.value,
  };

  return TextImportRulesValidator.validate(rule).errors;
});

function validateRegex(val: string) {
  if (!val) return "Regex is required";
  try {
    new RegExp(val);
    return true;
  } catch (e) {
    return "Invalid regular expression";
  }
}

// Rule management
function addWalletRule() {
  walletMatchRules.value.push({
    operator: "contains",
    value: "",
    walletId: "",
  });
}

function removeWalletRule(index: number) {
  walletMatchRules.value.splice(index, 1);
}

function addExpenseAvenueRule() {
  expenseAvenueMatchRules.value.push({
    operator: "contains",
    value: "",
    expenseAvenueId: "",
  });
}

function removeExpenseAvenueRule(index: number) {
  expenseAvenueMatchRules.value.splice(index, 1);
}

function getCurrentRuleData(): Partial<TextImportRules> {
  return {
    name: ruleName.value,
    description: ruleDescription.value,
    regex: ruleRegex.value,
    walletCaptureGroup: walletCaptureGroup.value,
    expenseAvenueCaptureGroup: expenseAvenueCaptureGroup.value,
    dateCaptureGroup: dateCaptureGroup.value,
    amountCaptureGroup: amountCaptureGroup.value,
    dateFormat: dateFormat.value,
    walletMatchRules: walletMatchRules.value,
    expenseAvenueMatchRules: expenseAvenueMatchRules.value,
    isActive: ruleIsActive.value,
  };
}

// Export/Import
function exportAsCodeClicked() {
  $q.dialog({
    component: ExportTextImportRuleDialog,
    componentProps: {
      rule: getCurrentRuleData(),
    },
  });
}

function importCodeClicked() {
  $q.dialog({
    component: ImportTextImportRuleDialog,
  }).onOk((importedRule: Partial<TextImportRules>) => {
    // Update UI values with imported data
    if (importedRule.name !== undefined) ruleName.value = importedRule.name;
    if (importedRule.description !== undefined) ruleDescription.value = importedRule.description;
    if (importedRule.regex !== undefined) ruleRegex.value = importedRule.regex;
    if (importedRule.walletCaptureGroup !== undefined) walletCaptureGroup.value = importedRule.walletCaptureGroup;
    if (importedRule.expenseAvenueCaptureGroup !== undefined) expenseAvenueCaptureGroup.value = importedRule.expenseAvenueCaptureGroup;
    if (importedRule.dateCaptureGroup !== undefined) dateCaptureGroup.value = importedRule.dateCaptureGroup;
    if (importedRule.amountCaptureGroup !== undefined) amountCaptureGroup.value = importedRule.amountCaptureGroup;
    if (importedRule.dateFormat !== undefined) dateFormat.value = importedRule.dateFormat;
    if (importedRule.walletMatchRules !== undefined) walletMatchRules.value = [...importedRule.walletMatchRules];
    if (importedRule.expenseAvenueMatchRules !== undefined) expenseAvenueMatchRules.value = [...importedRule.expenseAvenueMatchRules];
    if (importedRule.isActive !== undefined) ruleIsActive.value = importedRule.isActive;

    $q.notify({
      type: "positive",
      message: "Rule imported successfully! Review and save to apply changes.",
    });
  });
}

// Save
async function okClicked() {
  if (!(await ruleForm.value?.validate())) {
    return;
  }

  if (validationErrors.value.length > 0) {
    $q.notify({
      type: "negative",
      message: "Please fix validation errors before saving",
    });
    return;
  }

  try {
    let rule: TextImportRules = {
      $collection: Collection.TEXT_IMPORT_RULES,
      name: ruleName.value,
      description: ruleDescription.value,
      regex: ruleRegex.value,
      walletCaptureGroup: walletCaptureGroup.value,
      expenseAvenueCaptureGroup: expenseAvenueCaptureGroup.value,
      dateCaptureGroup: dateCaptureGroup.value,
      amountCaptureGroup: amountCaptureGroup.value,
      dateFormat: dateFormat.value,
      walletMatchRules: walletMatchRules.value,
      expenseAvenueMatchRules: expenseAvenueMatchRules.value,
      isActive: ruleIsActive.value,
    };

    if (initialDoc) {
      rule = Object.assign({}, initialDoc, rule);
    }

    await pouchdbService.upsertDoc(rule);
    onDialogOK();
  } catch (error) {
    console.error("Error saving rule:", error);
    $q.notify({
      type: "negative",
      message: "Error saving rule",
    });
  }
}

// Cancel
const cancelClicked = onDialogCancel;
</script>

<style scoped lang="scss"></style>
