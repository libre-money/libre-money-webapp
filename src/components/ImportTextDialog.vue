<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">Import Text</div>
        <q-form class="q-gutter-md q-pa-md" ref="importForm">
          <q-input type="textarea" filled v-model="importText" label="Paste your text here" lazy-rules :rules="validators.required" autogrow />

          <q-select
            filled
            v-model="selectedRuleId"
            :options="ruleOptions"
            label="Select Import Rule"
            emit-value
            map-options
            lazy-rules
            :rules="validators.required"
          />

          <div v-if="parsedData" class="q-mt-md">
            <div class="text-h6">Parsed Data</div>
            <q-list bordered separator>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Wallet</q-item-label>
                  <q-item-label>{{ parsedData.wallet?.name }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Expense Avenue</q-item-label>
                  <q-item-label>{{ parsedData.expenseAvenue?.name }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Date</q-item-label>
                  <q-item-label>{{ parsedData.date }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Amount</q-item-label>
                  <q-item-label>{{ parsedData.amount }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <q-btn color="primary" label="Parse" @click="parseClicked" />
        <q-btn v-if="parsedData" color="green" label="Create Expense" @click="createExpenseClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { QForm, useDialogPluginComponent, useQuasar } from "quasar";
import { Ref, ref } from "vue";
import { validators } from "src/utils/validators";
import { TextImportRules, TextImportRulesValidator } from "src/models/text-import-rules";
import { pouchdbService } from "src/services/pouchdb-service";
import { Collection } from "src/constants/constants";
import { dialogService } from "src/services/dialog-service";
import AddExpenseRecord from "src/components/AddExpenseRecord.vue";
import { date } from "quasar";
import { Wallet } from "src/models/wallet";
import { ExpenseAvenue } from "src/models/expense-avenue";
import { ExpenseRecordSuggestion } from "src/models/inferred/expense-record-suggestion";

const parse = (text: string, format: string) => {
  return date.extractDate(text, format);
};

export default {
  emits: [...useDialogPluginComponent.emits],

  setup() {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
    const $q = useQuasar();

    const importForm: Ref<QForm | null> = ref(null);
    const importText: Ref<string | null> = ref(null);
    const selectedRuleId: Ref<string | null> = ref("AUTO_DETECT_ALL_RULES");
    const parsedData: Ref<ExpenseRecordSuggestion | null> = ref(null);

    const ruleOptions = ref<{ label: string; value: string }[]>([]);

    async function getRuleList(): Promise<TextImportRules[]> {
      const res = await pouchdbService.listByCollection(Collection.TEXT_IMPORT_RULES);
      const rules = res.docs as TextImportRules[];
      return rules;
    }

    async function loadRules() {
      const activeRules = (await getRuleList()).filter((rule) => rule.isActive);

      ruleOptions.value = [
        {
          label: "🔍 Try all rules (auto-detect)",
          value: "AUTO_DETECT_ALL_RULES",
        },
        ...activeRules.map((rule) => ({
          label: rule.name,
          value: rule._id!,
        })),
      ];
    }

    loadRules();

    const parseText = async () => {
      if (!selectedRuleId.value || !importText.value) return;

      let rule: TextImportRules | null = null;
      let match: RegExpMatchArray | null = null;

      if (selectedRuleId.value === "AUTO_DETECT_ALL_RULES") {
        // Try all rules and find the first one that matches
        const allRules = (await getRuleList()).filter((r) => r.isActive);
        console.debug("Auto-detecting rule from", allRules.length, "active rules");

        for (const testRule of allRules) {
          console.debug("Testing rule:", testRule.name);
          const regex = new RegExp(testRule.regex);
          const testMatch = importText.value.match(regex);

          if (testMatch) {
            // Check if all capture groups are present (non-empty)
            const capturedWallet = testMatch[testRule.walletCaptureGroup];
            const capturedExpenseAvenue = testMatch[testRule.expenseAvenueCaptureGroup];
            const capturedDate = testMatch[testRule.dateCaptureGroup];
            const capturedAmount = testMatch[testRule.amountCaptureGroup];

            if (capturedWallet && capturedExpenseAvenue && capturedDate && capturedAmount) {
              console.debug("Rule matched:", testRule.name);
              rule = testRule;
              match = testMatch;

              // Update the dropdown to show which rule was selected
              selectedRuleId.value = testRule._id!;

              $q.notify({
                type: "positive",
                message: `Auto-detected rule: "${testRule.name}"`,
                timeout: 2000,
              });
              break;
            } else {
              console.debug("Rule regex matched but capture groups incomplete:", testRule.name);
            }
          }
        }

        if (!rule) {
          $q.notify({
            type: "negative",
            message: "No matching rule found for the provided text",
          });
          return;
        }
      } else {
        // Use the manually selected rule
        rule = (await getRuleList()).find((r) => r._id === selectedRuleId.value) || null;
        if (!rule) {
          $q.notify({
            type: "negative",
            message: "Selected rule not found",
          });
          return;
        }

        console.debug("Selected rule:", rule);
        console.debug("Text to parse:", importText.value);

        const regex = new RegExp(rule.regex);
        console.debug("Regex pattern:", regex);

        match = importText.value.match(regex);
        console.debug("Match result:", match);

        if (!match) {
          $q.notify({
            type: "negative",
            message: "Text does not match the selected rule pattern",
          });
          return;
        }
      }

      // Final validation that we have both rule and match
      if (!rule || !match) {
        $q.notify({
          type: "negative",
          message: "Unable to process text with selected rule",
        });
        return;
      }

      try {
        // Check if all capture groups are present (non-empty)
        const capturedWallet = match[rule.walletCaptureGroup];
        const capturedExpenseAvenue = match[rule.expenseAvenueCaptureGroup];
        const capturedDate = match[rule.dateCaptureGroup];
        const capturedAmount = match[rule.amountCaptureGroup];

        if (!capturedWallet || !capturedExpenseAvenue || !capturedDate || !capturedAmount) {
          $q.notify({
            type: "negative",
            message: "Rule failed: One or more capture groups are empty",
          });
          return;
        }

        // Match wallet using flexible rules
        let matchingWallet: Wallet | null = null;
        const walletsList = (await pouchdbService.listByCollection(Collection.WALLET)).docs as Wallet[];
        console.debug("Wallets list:", walletsList);

        for (const walletRule of rule.walletMatchRules) {
          if (TextImportRulesValidator.matchValue(capturedWallet, walletRule)) {
            matchingWallet = walletsList.find((w) => w._id === walletRule.walletId) || null;
            if (matchingWallet) break;
          }
        }

        if (!matchingWallet) {
          $q.notify({
            type: "negative",
            message: `No wallet matched for captured value: ${capturedWallet}`,
          });
          return;
        }

        // Match expense avenue using flexible rules
        let matchingExpenseAvenue: ExpenseAvenue | null = null;
        const expenseAvenuesList = (await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE)).docs as ExpenseAvenue[];
        console.debug("Expense avenues list:", expenseAvenuesList);

        for (const expenseAvenueRule of rule.expenseAvenueMatchRules) {
          if (TextImportRulesValidator.matchValue(capturedExpenseAvenue, expenseAvenueRule)) {
            matchingExpenseAvenue = expenseAvenuesList.find((ea) => ea._id === expenseAvenueRule.expenseAvenueId) || null;
            if (matchingExpenseAvenue) break;
          }
        }

        if (!matchingExpenseAvenue) {
          $q.notify({
            type: "negative",
            message: `No expense avenue matched for captured value: ${capturedExpenseAvenue}`,
          });
          return;
        }

        // Validate and parse date
        const parsedDate = parse(capturedDate, rule.dateFormat);
        if (!parsedDate) {
          $q.notify({
            type: "negative",
            message: `Invalid date format. Expected: ${rule.dateFormat}, Got: ${capturedDate}`,
          });
          return;
        }

        // Validate and parse amount (handle comma separators)
        const cleanedAmount = capturedAmount.replace(/,/g, ""); // Remove commas
        const amount = parseFloat(cleanedAmount);
        if (isNaN(amount)) {
          $q.notify({
            type: "negative",
            message: `Invalid amount: ${capturedAmount}`,
          });
          return;
        }

        parsedData.value = {
          wallet: matchingWallet,
          expenseAvenue: matchingExpenseAvenue,
          date: parsedDate.toISOString(),
          amount: amount,
          notes: `Imported from text: ${importText.value}`,
        };

        console.debug("Parsed data:", parsedData.value);
      } catch (error) {
        console.error("Error parsing data:", error);
        $q.notify({
          type: "negative",
          message: "Error parsing data from text",
        });
      }
    };

    async function createExpenseClicked() {
      if (!parsedData.value) return;

      $q.dialog({
        component: AddExpenseRecord,
        componentProps: {
          suggestion: parsedData.value,
        },
      }).onOk(() => {
        onDialogOK();
      });
    }

    return {
      dialogRef,
      onDialogHide,
      cancelClicked: onDialogCancel,
      importForm,
      importText,
      selectedRuleId,
      ruleOptions,
      parsedData,
      validators,
      parseClicked: parseText,
      createExpenseClicked,
    };
  },
};
</script>

<style scoped lang="scss"></style>
