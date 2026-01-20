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
  const documentId = (doc as any)?._id || "new document";

  console.debug("[Zod Validation] Starting validation", {
    collection: collectionName,
    documentId: documentId,
    hasCollection: !!collectionName,
  });

  if (!collectionName) {
    console.debug("[Zod Validation] Validation failed: missing $collection field", {
      documentId: documentId,
      docKeys: doc && typeof doc === "object" ? Object.keys(doc as object) : [],
    });
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
    console.warn(`[Zod Validation] No validation schema found for collection: ${collectionName}`, {
      documentId: documentId,
      availableCollections: Array.from(schemaRegistry.keys()),
    });
    return {
      success: true,
      data: doc,
    };
  }

  console.debug("[Zod Validation] Schema found, parsing document", {
    collection: collectionName,
    documentId: documentId,
    inputType: typeof doc,
    inputKeys: doc && typeof doc === "object" ? Object.keys(doc as object).slice(0, 10) : [],
  });

  const result = schema.safeParse(doc);

  if (result.success) {
    // Check if data was coerced/changed
    const inputStr = JSON.stringify(doc);
    const outputStr = JSON.stringify(result.data);
    const wasCoerced = inputStr !== outputStr;

    console.debug("[Zod Validation] Validation successful", {
      collection: collectionName,
      documentId: documentId,
      wasCoerced: wasCoerced,
      inputSample: doc && typeof doc === "object" ? JSON.stringify((doc as any).name || (doc as any)._id || "N/A").substring(0, 50) : String(doc).substring(0, 50),
    });

    if (wasCoerced) {
      console.debug("[Zod Validation] Data was coerced during validation", {
        collection: collectionName,
        documentId: documentId,
        inputLength: inputStr.length,
        outputLength: outputStr.length,
        // Log first difference if any
        sampleDiff: inputStr.substring(0, 100) !== outputStr.substring(0, 100) ? "Values differ" : "Structure differs",
      });
    }

    return {
      success: true,
      data: result.data,
    };
  } else {
    const errorDetails = result.error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
      code: err.code,
    }));

    console.debug("[Zod Validation] Validation failed", {
      collection: collectionName,
      documentId: documentId,
      errorCount: result.error.errors.length,
      errors: errorDetails,
      firstError: errorDetails[0],
    });

    console.debug("[Zod Validation] Invalid document data", {
      collection: collectionName,
      documentId: documentId,
      documentPreview: doc && typeof doc === "object" 
        ? JSON.stringify(doc, null, 2).substring(0, 500)
        : String(doc).substring(0, 200),
    });

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
