import { z } from "zod";
import { validateDocument, ValidationResult } from "src/schemas";

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  constructor(
    public collection: string,
    public documentId: string | undefined,
    public zodErrors: z.ZodError
  ) {
    const docId = documentId || "new document";
    super(`Validation failed for ${collection} document: ${docId}`);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Convert Zod errors to user-friendly messages
   */
  toUserFriendlyMessage(): string {
    const errors = this.zodErrors.errors.map((err) => {
      const path = err.path.join(".");
      return `${path ? `${path}: ` : ""}${err.message}`;
    });

    return `Validation errors:\n${errors.join("\n")}`;
  }

  /**
   * Get a summary of validation errors
   */
  getErrorSummary(): string {
    if (this.zodErrors.errors.length === 0) {
      return "Unknown validation error";
    }

    const firstError = this.zodErrors.errors[0];
    const path = firstError.path.length > 0 ? firstError.path.join(".") : "document";
    return `${path}: ${firstError.message}`;
  }
}

/**
 * Validate a document and throw ValidationError if invalid
 * @param doc - Document to validate
 * @param collection - Collection name (optional)
 * @returns Validated and coerced document
 * @throws ValidationError if validation fails
 */
export function validateOrThrow<T = unknown>(doc: unknown, collection?: string): T {
  const collectionName = collection || (doc as any)?.$collection || "unknown";
  const documentId = (doc as any)?._id || "new document";

  console.debug("[validateOrThrow] Starting validation", {
    collection: collectionName,
    documentId: documentId,
    caller: new Error().stack?.split("\n")[2]?.trim() || "unknown",
  });

  const result = validateDocument(doc, collection);

  if (!result.success) {
    console.debug("[validateOrThrow] Validation failed, throwing error", {
      collection: collectionName,
      documentId: documentId,
      errorCount: result.errors?.errors.length || 0,
    });
    throw new ValidationError(collectionName, documentId, result.errors!);
  }

  console.debug("[validateOrThrow] Validation successful", {
    collection: collectionName,
    documentId: documentId,
  });

  return result.data as T;
}

/**
 * Validate a document and return a result object (doesn't throw)
 * @param doc - Document to validate
 * @param collection - Collection name (optional)
 * @returns Validation result
 */
export function safeValidate<T = unknown>(
  doc: unknown,
  collection?: string
): ValidationResult<T> {
  const collectionName = collection || (doc as any)?.$collection || "unknown";
  const documentId = (doc as any)?._id || "new document";

  console.debug("[safeValidate] Starting validation", {
    collection: collectionName,
    documentId: documentId,
    caller: new Error().stack?.split("\n")[2]?.trim() || "unknown",
  });

  const result = validateDocument(doc, collection) as ValidationResult<T>;

  console.debug("[safeValidate] Validation completed", {
    collection: collectionName,
    documentId: documentId,
    success: result.success,
    hasErrors: !result.success && result.errors ? result.errors.errors.length : 0,
  });

  return result;
}
