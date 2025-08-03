export type MatchingOperator = "exact-match" | "contains" | "starts-with" | "ends-with" | "regex";

export type WalletMatchRule = {
  operator: MatchingOperator;
  value: string;
  walletId: string;
};

export type ExpenseAvenueMatchRule = {
  operator: MatchingOperator;
  value: string;
  expenseAvenueId: string;
};

export type TextImportRules = {
  _id?: string;
  _rev?: string;
  $collection: string;
  name: string;
  description?: string;
  regex: string;
  // WALLET
  walletCaptureGroup: number;
  walletMatchRules: WalletMatchRule[];
  // EXPENSE AVENUE
  expenseAvenueCaptureGroup: number;
  expenseAvenueMatchRules: ExpenseAvenueMatchRule[];
  // DATE
  dateCaptureGroup: number;
  dateFormat: string;
  // AMOUNT
  amountCaptureGroup: number;
  // COMMON
  isActive: boolean;
  dissuadeEditing?: boolean;
  denyDeletion?: boolean;
};

export class TextImportRulesValidator {
  static validate(rule: Partial<TextImportRules>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields in the JSON configuration
    const requiredJsonFields: (keyof TextImportRules)[] = [
      "name",
      "description",
      "regex",
      "walletCaptureGroup",
      "expenseAvenueCaptureGroup",
      "dateCaptureGroup",
      "amountCaptureGroup",
      "dateFormat",
      "walletMatchRules",
      "expenseAvenueMatchRules",
    ];

    // Check JSON configuration fields
    for (const field of requiredJsonFields) {
      if (rule[field] === undefined) {
        errors.push(`Missing required field in JSON configuration: ${field}`);
      }
    }

    // Validate regex
    if (rule.regex) {
      try {
        new RegExp(rule.regex);
      } catch (e) {
        errors.push("Invalid regular expression");
      }
    }

    // Validate capture groups are non-negative integers
    const captureGroups = [
      { name: "walletCaptureGroup", value: rule.walletCaptureGroup },
      { name: "expenseAvenueCaptureGroup", value: rule.expenseAvenueCaptureGroup },
      { name: "dateCaptureGroup", value: rule.dateCaptureGroup },
      { name: "amountCaptureGroup", value: rule.amountCaptureGroup },
    ];

    for (const group of captureGroups) {
      if (group.value !== undefined && (group.value < 0 || !Number.isInteger(group.value))) {
        errors.push(`${group.name} must be a non-negative integer`);
      }
    }

    // Validate wallet match rules
    if (rule.walletMatchRules) {
      if (!Array.isArray(rule.walletMatchRules)) {
        errors.push("walletMatchRules must be an array");
      } else if (rule.walletMatchRules.length === 0) {
        errors.push("walletMatchRules must contain at least one rule");
      } else {
        rule.walletMatchRules.forEach((matchRule, index) => {
          if (!matchRule.operator || !matchRule.value || !matchRule.walletId) {
            errors.push(`walletMatchRules[${index}] must have operator, value, and walletId`);
          }
          if (matchRule.operator && !["exact-match", "contains", "starts-with", "ends-with", "regex"].includes(matchRule.operator)) {
            errors.push(`walletMatchRules[${index}] has invalid operator: ${matchRule.operator}`);
          }
          if (matchRule.operator === "regex" && matchRule.value) {
            try {
              new RegExp(matchRule.value);
            } catch (e) {
              errors.push(`walletMatchRules[${index}] has invalid regex pattern`);
            }
          }
        });
      }
    }

    // Validate expense avenue match rules
    if (rule.expenseAvenueMatchRules) {
      if (!Array.isArray(rule.expenseAvenueMatchRules)) {
        errors.push("expenseAvenueMatchRules must be an array");
      } else if (rule.expenseAvenueMatchRules.length === 0) {
        errors.push("expenseAvenueMatchRules must contain at least one rule");
      } else {
        rule.expenseAvenueMatchRules.forEach((matchRule, index) => {
          if (!matchRule.operator || !matchRule.value || !matchRule.expenseAvenueId) {
            errors.push(`expenseAvenueMatchRules[${index}] must have operator, value, and expenseAvenueId`);
          }
          if (matchRule.operator && !["exact-match", "contains", "starts-with", "ends-with", "regex"].includes(matchRule.operator)) {
            errors.push(`expenseAvenueMatchRules[${index}] has invalid operator: ${matchRule.operator}`);
          }
          if (matchRule.operator === "regex" && matchRule.value) {
            try {
              new RegExp(matchRule.value);
            } catch (e) {
              errors.push(`expenseAvenueMatchRules[${index}] has invalid regex pattern`);
            }
          }
        });
      }
    }

    // Validate date format
    if (rule.dateFormat) {
      const testDate = new Date();
      try {
        // Try to format a test date with the provided format
        const formatted = testDate.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
        // This is a basic check - you might want to add more specific format validation
        if (!rule.dateFormat.includes("DD") && !rule.dateFormat.includes("MM") && !rule.dateFormat.includes("YY")) {
          errors.push("Invalid date format. Must include DD, MM, and YY placeholders");
        }
      } catch (e) {
        errors.push("Invalid date format");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static matchValue(capturedValue: string, matchRule: WalletMatchRule | ExpenseAvenueMatchRule): boolean {
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
}
