import { pouchdbService } from "./pouchdb-service";
import { useUserStore } from "src/stores/user";
import { safeValidate, ValidationError } from "src/utils/validation-utils";

export interface LibreMoneyBackupPayloadV1 {
  identity: "Libre Money Backup";
  epoch: number;
  dateTime: string;
  /**
   * List of documents (each must contain `_id`).
   * Note: `_rev` may be present in backups but restore intentionally ignores it.
   */
  docs: any[];
}

function toComparable(value: any): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(toComparable);
  if (typeof value !== "object") return value;
  const keys = Object.keys(value).sort();
  const out: any = {};
  for (const k of keys) {
    // Ignore CouchDB revision during comparison
    if (k === "_rev") continue;
    out[k] = toComparable(value[k]);
  }
  return out;
}

function areDocsDifferentIgnoringRev(a: any, b: any): boolean {
  return JSON.stringify(toComparable(a)) !== JSON.stringify(toComparable(b));
}

function extractDocsFromPayload(payload: any): any[] {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.docs)) return payload.docs;
  return [];
}

export const dataBackupService = {
  async exportAllDataToJson(): Promise<string> {
    const res = await pouchdbService.listDocs();
    const rows = res.rows || [];
    const docs = rows.map((r: any) => r?.doc).filter(Boolean);
    const payload: LibreMoneyBackupPayloadV1 = {
      identity: "Libre Money Backup",
      epoch: Date.now(),
      dateTime: new Date().toISOString(),
      docs,
    };
    return JSON.stringify(payload, null, 2);
  },

  async initiateFileDownload(jsonData: string) {
    const userStore = useUserStore();
    const domain = userStore.currentUser?.domain || "unknown";
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    const hours = String(now.getUTCHours()).padStart(2, "0");
    const minutes = String(now.getUTCMinutes()).padStart(2, "0");
    const seconds = String(now.getUTCSeconds()).padStart(2, "0");
    const datetime = `${year}-${month}-${day}--${hours}-${minutes}-${seconds}`;
    const fileName = `libre-money-backup--${domain}--${datetime}.json`;
    const fileContent = jsonData;
    const blob = new Blob([fileContent], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      const windowUrl = window.URL || window.webkitURL;
      windowUrl.revokeObjectURL(url);
    }, 100);
  },

  /**
   * Restores docs from a JSON payload.
   * - Ignores `_rev` from backup.
   * - Only writes docs that differ (by deep comparison excluding `_rev`).
   * - Does NOT delete docs not present in the backup.
   * - Excludes design documents (those with `_id` starting with `_design/`).
   */
  async restoreAllDataFromPayload(payload: any, onProgress?: (p: { processed: number; total: number; }) => void) {
    const docs = extractDocsFromPayload(payload);
    const total = docs.length;
    const db = pouchdbService.getDb();

    const validDocs = docs.filter((d) => {
      if (!d || typeof d !== "object" || typeof d._id !== "string" || d._id.trim().length === 0) {
        return false;
      }
      // Exclude design documents
      if (d._id.startsWith("_design/")) {
        return false;
      }
      return true;
    });

    const keys = validDocs.map((d) => d._id);
    const existingById = new Map<string, any>();
    if (keys.length > 0) {
      const existing = await db.allDocs({ keys, include_docs: true });
      for (const row of existing.rows || []) {
        const doc = (row as any)?.doc;
        const id = (doc as any)?._id;
        if (doc && typeof id === "string") {
          existingById.set(id, doc);
        }
      }
    }

    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let validationErrors = 0;
    const invalid = total - validDocs.length;

    const upserts: any[] = [];
    for (let backupDoc of validDocs) {
      processed += 1;

      console.debug("[data-backup-service.restoreAllDataFromPayload] Validating document", {
        documentId: backupDoc._id,
        collection: backupDoc.$collection,
        processed: processed,
        total: total,
      });

      // Validate document before adding to upserts
      const validation = safeValidate(backupDoc, backupDoc.$collection);
      if (!validation.success) {
        // Log validation error but continue (for backward compatibility with old backups)
        console.warn(
          `[data-backup-service] Validation failed for document ${backupDoc._id} in collection ${backupDoc.$collection}:`,
          validation.errors?.errors
        );
        console.debug("[data-backup-service] Validation error details", {
          documentId: backupDoc._id,
          collection: backupDoc.$collection,
          errors: validation.errors?.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
          documentPreview: JSON.stringify(backupDoc, null, 2).substring(0, 500),
        });
        validationErrors += 1;
        
        // Try to use validated data if available, otherwise skip this document
        if (validation.data) {
          // Use validated/coerced data
          console.debug("[data-backup-service] Using coerced data despite validation errors", {
            documentId: backupDoc._id,
            collection: backupDoc.$collection,
          });
          backupDoc = validation.data;
        } else {
          // Skip invalid document
          console.warn(`[data-backup-service] Skipping invalid document: ${backupDoc._id}`);
          continue;
        }
      } else if (validation.data) {
        // Use validated/coerced data
        console.debug("[data-backup-service] Using validated/coerced data", {
          documentId: backupDoc._id,
          collection: backupDoc.$collection,
        });
        backupDoc = validation.data;
      } else {
        console.debug("[data-backup-service] Validation passed, no coercion needed", {
          documentId: backupDoc._id,
          collection: backupDoc.$collection,
        });
      }

      const existingDoc = existingById.get(backupDoc._id);
      if (!existingDoc) {
        const toCreate = { ...backupDoc };
        delete (toCreate as any)._rev;
        upserts.push(toCreate);
        created += 1;
      } else {
        const different = areDocsDifferentIgnoringRev(existingDoc, backupDoc);
        if (!different) {
          skipped += 1;
        } else {
          const toUpdate = { ...backupDoc, _rev: existingDoc._rev };
          upserts.push(toUpdate);
          updated += 1;
        }
      }

      if (processed === 1 || processed % 50 === 0 || processed === total) {
        onProgress?.({ processed, total });
      }
    }

    // Bulk write in chunks to avoid huge payloads
    const CHUNK_SIZE = 200;
    for (let i = 0; i < upserts.length; i += CHUNK_SIZE) {
      const chunk = upserts.slice(i, i + CHUNK_SIZE);
      await db.bulkDocs(chunk);
    }

    return { total, processed, created, updated, skipped, invalid, validationErrors };
  },
};
