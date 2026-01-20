import { z } from "zod";
import { BaseDocumentSchema } from "./base";
import { Collection } from "src/constants/constants";

/**
 * MatchingOperator enum schema
 */
const MatchingOperatorSchema = z.enum([
  "exact-match",
  "contains",
  "starts-with",
  "ends-with",
  "regex",
]);

/**
 * WalletMatchRule schema
 */
const WalletMatchRuleSchema = z.object({
  operator: MatchingOperatorSchema,
  value: z.string(),
  walletId: z.string().min(1, "Wallet ID is required"),
}).refine(
  (data) => {
    // Validate regex if operator is regex
    if (data.operator === "regex") {
      try {
        new RegExp(data.value);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  },
  {
    message: "Invalid regex pattern in wallet match rule",
  }
);

/**
 * ExpenseAvenueMatchRule schema
 */
const ExpenseAvenueMatchRuleSchema = z.object({
  operator: MatchingOperatorSchema,
  value: z.string(),
  expenseAvenueId: z.string().min(1, "Expense avenue ID is required"),
}).refine(
  (data) => {
    // Validate regex if operator is regex
    if (data.operator === "regex") {
      try {
        new RegExp(data.value);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  },
  {
    message: "Invalid regex pattern in expense avenue match rule",
  }
);

/**
 * TextImportRules schema
 * Replaces the old TextImportRulesValidator class
 */
export const TextImportRulesSchema = BaseDocumentSchema.extend({
  $collection: z.literal(Collection.TEXT_IMPORT_RULES),
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional(),
  regex: z.string().refine(
    (val) => {
      try {
        new RegExp(val);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: "Invalid regular expression",
    }
  ),
  walletCaptureGroup: z.coerce.number().int().min(0, "Wallet capture group must be a non-negative integer"),
  walletMatchRules: z.array(WalletMatchRuleSchema).min(1, "At least one wallet match rule is required"),
  expenseAvenueCaptureGroup: z.coerce.number().int().min(0, "Expense avenue capture group must be a non-negative integer"),
  expenseAvenueMatchRules: z.array(ExpenseAvenueMatchRuleSchema).min(1, "At least one expense avenue match rule is required"),
  dateCaptureGroup: z.coerce.number().int().min(0, "Date capture group must be a non-negative integer"),
  dateFormat: z.string().min(1, "Date format is required"),
  amountCaptureGroup: z.coerce.number().int().min(0, "Amount capture group must be a non-negative integer"),
  isActive: z.boolean(),
  dissuadeEditing: z.boolean().optional(),
  denyDeletion: z.boolean().optional(),
});

/**
 * TextImportRules type inferred from Zod schema
 */
export type TextImportRules = z.infer<typeof TextImportRulesSchema>;

/**
 * MatchingOperator type inferred from Zod schema
 */
export type MatchingOperator = z.infer<typeof MatchingOperatorSchema>;

/**
 * WalletMatchRule type inferred from Zod schema
 */
export type WalletMatchRule = z.infer<typeof WalletMatchRuleSchema>;

/**
 * ExpenseAvenueMatchRule type inferred from Zod schema
 */
export type ExpenseAvenueMatchRule = z.infer<typeof ExpenseAvenueMatchRuleSchema>;

/**
 * Utility function to match a captured value against a match rule
 * This replaces the old TextImportRulesValidator.matchValue method
 */
export function matchValue(
  capturedValue: string,
  matchRule: WalletMatchRule | ExpenseAvenueMatchRule
): boolean {
  if (!capturedValue || !matchRule.value) return false;

  switch (matchRule.operator) {
    case "exact-match":
      return capturedValue === matchRule.value;
    case "contains":
      return capturedValue.toLowerCase().includes(matchRule.value.toLowerCase());
    case "starts-with":
      return capturedValue.toLowerCase().startsWith(matchRule.value.toLowerCase());
    case "ends-with":
      return capturedValue.toLowerCase().endsWith(matchRule.value.toLowerCase());
    case "regex":
      try {
        const regex = new RegExp(matchRule.value, "i");
        return regex.test(capturedValue);
      } catch (e) {
        return false;
      }
    default:
      return false;
  }
}
