import { z } from "zod";
import { Collection } from "src/constants/constants";

// Import all schemas
import { WalletSchema } from "./wallet";
import { CurrencySchema } from "./currency";
import { AssetSchema } from "./asset";
import { PartySchema } from "./party";
import { TagSchema } from "./tag";
import { ExpenseAvenueSchema } from "./expense-avenue";
import { IncomeSourceSchema } from "./income-source";
import { RecordSchema } from "./record";
import { MemoSchema } from "./memo";
import { RollingBudgetSchema } from "./rolling-budget";
import { TextImportRulesSchema } from "./text-import-rules";

// Export all types
export type { Wallet } from "./wallet";
export type { Currency } from "./currency";
export type { Asset } from "./asset";
export type { Party } from "./party";
export type { Tag } from "./tag";
export type { ExpenseAvenue } from "./expense-avenue";
export type { IncomeSource } from "./income-source";
export type { Record } from "./record";
export type { Memo } from "./memo";
export type { RollingBudget, BudgetedPeriod } from "./rolling-budget";
export type { TextImportRules, MatchingOperator, WalletMatchRule, ExpenseAvenueMatchRule } from "./text-import-rules";

/**
 * Schema registry mapping collection names to their Zod schemas
 */
const schemaRegistry = new Map<string, z.ZodSchema>();

// Register all schemas
schemaRegistry.set(Collection.WALLET, WalletSchema);
schemaRegistry.set(Collection.CURRENCY, CurrencySchema);
schemaRegistry.set(Collection.ASSET, AssetSchema);
schemaRegistry.set(Collection.PARTY, PartySchema);
schemaRegistry.set(Collection.TAG, TagSchema);
schemaRegistry.set(Collection.EXPENSE_AVENUE, ExpenseAvenueSchema);
schemaRegistry.set(Collection.INCOME_SOURCE, IncomeSourceSchema);
schemaRegistry.set(Collection.RECORD, RecordSchema);
schemaRegistry.set(Collection.MEMO, MemoSchema);
schemaRegistry.set(Collection.ROLLING_BUDGET, RollingBudgetSchema);
schemaRegistry.set(Collection.TEXT_IMPORT_RULES, TextImportRulesSchema);
// Add more collections as schemas are created

/**
 * Get the Zod schema for a given collection name
 * @param collection - The collection name
 * @returns The Zod schema or null if not found
 */
export function getSchemaForCollection(collection: string): z.ZodSchema | null {
  return schemaRegistry.get(collection) || null;
}

/**
 * Validation result type
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
}

/**
 * Validate a document against its collection's schema
 * @param doc - The document to validate
 * @param collection - The collection name (optional, will use doc.$collection if not provided)
 * @returns Validation result with parsed/coerced data or errors
 */
export function validateDocument(
  doc: unknown,
  collection?: string
): ValidationResult {
  const collectionName = collection || (doc as any)?.$collection;

  if (!collectionName) {
    return {
      success: false,
      errors: new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "Document must have a $collection field",
          path: ["$collection"],
        },
      ]),
    };
  }

  const schema = getSchemaForCollection(collectionName);

  if (!schema) {
    // No schema found - allow it through with a warning (for backward compatibility)
    console.warn(`No validation schema found for collection: ${collectionName}`);
    return {
      success: true,
      data: doc,
    };
  }

  const result = schema.safeParse(doc);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  } else {
    return {
      success: false,
      errors: result.error,
    };
  }
}

/**
 * Parse and validate a document, throwing an error if validation fails
 * @param doc - The document to validate
 * @param collection - The collection name (optional)
 * @returns The validated and coerced document
 * @throws z.ZodError if validation fails
 */
export function parseDocument<T = unknown>(doc: unknown, collection?: string): T {
  const result = validateDocument(doc, collection);

  if (!result.success) {
    throw result.errors;
  }

  return result.data as T;
}
