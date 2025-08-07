import { credentialService } from "./credential-service";
import { configService } from "./config-service";
import { useUserStore } from "src/stores/user";
import { deepClone } from "src/utils/misc-utils";
import axios from "axios";

export interface AuditLogEntry {
  _id?: string;
  _rev?: string;
  timestamp: number;
  action: "upsert" | "remove" | "sync" | "sync-error" | "uncaught-error";
  documentId?: string;
  documentCollection?: string;
  documentData?: any; // For backward compatibility and remove/sync actions
  oldDocumentData?: any; // For upsert actions - the document before changes
  newDocumentData?: any; // For upsert actions - the document after changes
  errorMessage?: string; // For sync-error and uncaught-error actions
  errorDetails?: any; // For sync-error and uncaught-error actions - additional error context
  username: string;
  domain: string;
  userAgent: string;
  sessionId: string;
}

const IS_AUDIT_LOG_FEATURE_ENABLED = true;
const MAX_AUDIT_LOG_INCLUDED_DOCUMENT_SIZE_BYTES = 100_000; // 100KB
const LOCAL_DB_NAME = "cash-keeper-audit-log";
const BACKGROUND_SYNC_INTERVAL_MS = 10_000;

class AuditLogService {
  private auditDb: PouchDB.Database = new PouchDB(LOCAL_DB_NAME);
  private sessionId: string = this.generateSessionId();

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAuditDbUrl(): string {
    const { domain, serverUrl } = configService.getServerUrlAndDomainNameOrFail();
    return `${serverUrl}/${domain}-audit-log`;
  }

  isRemoteEnabled(): boolean {
    return IS_AUDIT_LOG_FEATURE_ENABLED && configService.getAuditLogRemoteEnabled();
  }

  private performBackgroundSync() {
    if (this.isRemoteEnabled() && credentialService.hasCredentials()) {
      this.performBackgroundSyncImpl();
    }
    this.setupNextBackgroundSync();
  }

  private async performBackgroundSyncImpl(): Promise<void> {
    if (!this.isRemoteEnabled() || !credentialService.hasCredentials()) {
      return;
    }

    try {
      const result = await this.syncAuditLogs();
      if (result.success) {
        console.debug(`Background audit log sync completed: ${result.syncedCount} entries synced`);
      } else {
        console.warn("Background audit log sync failed:", result.error);
      }
    } catch (error) {
      console.error("Background audit log sync error:", error);
    }
  }

  private setupNextBackgroundSync() {
    setTimeout(() => this.performBackgroundSync(), BACKGROUND_SYNC_INTERVAL_MS);
  }

  public async engineInit(origin: "LoginPage" | "GoOnlinePage" | "MainLayout") {
    console.debug("Audit log engine initialized from", origin);

    if (origin === "LoginPage" || origin === "GoOnlinePage") {
      const isRemoteEnabled = await this.checkRemoteAvailability();
      configService.setAuditLogRemoteEnabled(isRemoteEnabled);
    }

    this.setupNextBackgroundSync();
  }

  /**
   * Check if audit log feature is enabled on remote server by attempting to connect to the audit log database
   */
  private async checkRemoteAvailability(): Promise<boolean> {
    const { domain, serverUrl } = configService.getServerUrlAndDomainNameOrFail();
    const { username, password } = credentialService.getCredentials();
    try {
      const validateUrl = `${serverUrl}/${domain}/_all_docs`;
      const validateResponse = await axios.get(validateUrl, {
        auth: {
          username,
          password,
        },
      });

      if (validateResponse.status !== 200) {
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async logUpsert(newDoc: PouchDB.Core.PostDocument<any>, oldDoc?: PouchDB.Core.PostDocument<any>): Promise<void> {
    try {
      const userStore = useUserStore();
      const currentUser = userStore.currentUser;

      if (!currentUser) return;

      const auditEntry: AuditLogEntry = {
        timestamp: Date.now(),
        action: "upsert",
        documentId: newDoc._id || "new-document",
        documentCollection: newDoc.$collection,
        // Keep documentData for backward compatibility (use new document)
        documentData: this.sanitizeDocumentData(newDoc),
        // New fields for old/new document tracking
        oldDocumentData: oldDoc ? this.sanitizeDocumentData(oldDoc) : null,
        newDocumentData: this.sanitizeDocumentData(newDoc),
        username: currentUser.username,
        domain: currentUser.domain,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
      };

      await this.auditDb.post(auditEntry);
      console.debug("Audit log: Document upsert logged", newDoc._id, oldDoc ? "with old document" : "as new document");
    } catch (error) {
      console.error("Failed to log audit entry for upsert:", error);
      // Don't throw - audit logging should not break main functionality
    }
  }

  async logRemoval(doc: PouchDB.Core.PostDocument<any>): Promise<void> {
    try {
      const userStore = useUserStore();
      const currentUser = userStore.currentUser;

      if (!currentUser) return;

      const auditEntry: AuditLogEntry = {
        timestamp: Date.now(),
        action: "remove",
        documentId: doc._id,
        documentCollection: doc.$collection,
        documentData: this.sanitizeDocumentData(doc),
        username: currentUser.username,
        domain: currentUser.domain,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
      };

      await this.auditDb.post(auditEntry);
      console.debug("Audit log: Document removal logged", doc._id);
    } catch (error) {
      console.error("Failed to log audit entry for removal:", error);
      // Don't throw - audit logging should not break main functionality
    }
  }

  /**
   * Log a sync operation
   */
  async logSync(): Promise<void> {
    try {
      const userStore = useUserStore();
      const currentUser = userStore.currentUser;

      if (!currentUser) return;

      const auditEntry: AuditLogEntry = {
        timestamp: Date.now(),
        action: "sync",
        username: currentUser.username,
        domain: currentUser.domain,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
      };

      await this.auditDb.post(auditEntry);
      console.debug("Audit log: Sync operation logged");
    } catch (error) {
      console.error("Failed to log audit entry for sync:", error);
      // Don't throw - audit logging should not break main functionality
    }
  }

  /**
   * Log a sync error
   */
  async logSyncError(error: Error, context?: any): Promise<void> {
    try {
      const userStore = useUserStore();
      const currentUser = userStore.currentUser;

      if (!currentUser) return;

      const auditEntry: AuditLogEntry = {
        timestamp: Date.now(),
        action: "sync-error",
        errorMessage: error.message,
        errorDetails: {
          name: error.name,
          stack: error.stack,
          context: context,
        },
        username: currentUser.username,
        domain: currentUser.domain,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
      };

      await this.auditDb.post(auditEntry);
      console.debug("Audit log: Sync error logged", error.message);
    } catch (logError) {
      console.error("Failed to log audit entry for sync error:", logError);
      // Don't throw - audit logging should not break main functionality
    }
  }

  /**
   * Log an uncaught error
   */
  async logUncaughtError(error: Error, context?: any): Promise<void> {
    try {
      const userStore = useUserStore();
      const currentUser = userStore.currentUser;

      // Log even if no user is logged in (for early app errors)
      const auditEntry: AuditLogEntry = {
        timestamp: Date.now(),
        action: "uncaught-error",
        errorMessage: error.message,
        errorDetails: {
          name: error.name,
          stack: error.stack,
          context: context,
        },
        username: currentUser?.username || "unknown",
        domain: currentUser?.domain || "unknown",
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
      };

      await this.auditDb.post(auditEntry);
      console.debug("Audit log: Uncaught error logged", error.message);
    } catch (logError) {
      console.error("Failed to log audit entry for uncaught error:", logError);
      // Don't throw - audit logging should not break main functionality
    }
  }

  /**
   * Sanitize document data for audit logging
   * Removes sensitive fields and large data that shouldn't be logged
   */
  private sanitizeDocumentData(doc: any): any {
    if (!doc) return null;

    const sanitized = deepClone(doc);

    // Limit size of document data in audit log
    const serialized = JSON.stringify(sanitized);

    if (serialized.length < MAX_AUDIT_LOG_INCLUDED_DOCUMENT_SIZE_BYTES) {
      return sanitized;
    }

    // If document is too large, just store metadata
    return {
      _id: doc._id,
      $collection: doc.$collection,
      modifiedByUsername: doc.modifiedByUsername,
      modifiedEpoch: doc.modifiedEpoch,
      __truncated: true,
      __originalSize: serialized.length,
    };
  }

  async cleanup(): Promise<void> {
    if (this.auditDb) {
      try {
        await this.auditDb.destroy();
      } catch (error) {
        console.error("Error closing audit database:", error);
      }
    }
  }

  /**
   * Reset session ID (useful when user logs out/in)
   */
  resetSession(): void {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Get sync status information
   */
  async getSyncStatus(): Promise<{ isRemoteEnabled: boolean; hasCredentials: boolean; lastSyncTime?: number }> {
    const isRemoteEnabled = this.isRemoteEnabled();
    const hasCredentials = credentialService.hasCredentials();

    let lastSyncTime: number | undefined;
    if (isRemoteEnabled && hasCredentials) {
      try {
        // Get the most recent sync entry
        const result = await this.auditDb.allDocs({
          include_docs: true,
          limit: 1,
          descending: true,
        });

        const syncEntries = result.rows.map((row) => row.doc as AuditLogEntry).filter((entry) => entry && entry.action === "sync");

        if (syncEntries.length > 0) {
          lastSyncTime = syncEntries[0].timestamp;
        }
      } catch (error) {
        console.debug("Failed to get last sync time:", error);
      }
    }

    return {
      isRemoteEnabled,
      hasCredentials,
      lastSyncTime,
    };
  }

  /**
   * Sync audit logs to remote database
   *
   * This method syncs all local audit log entries to the remote audit log database.
   * It processes entries in batches to avoid overwhelming the server and provides
   * detailed feedback on the sync operation.
   *
   * @returns Promise resolving to sync result with success status, synced count, and optional error
   */
  async syncAuditLogs(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (!this.isRemoteEnabled() || !credentialService.hasCredentials()) {
      return { success: false, syncedCount: 0, error: "Remote sync not enabled or no credentials" };
    }

    try {
      const { domain, serverUrl } = configService.getServerUrlAndDomainNameOrFail();
      const remoteDbUrl = this.getAuditDbUrl();
      const remoteDB = new PouchDB(remoteDbUrl, {
        auth: credentialService.getCredentials(),
      });

      // Get all local audit logs that haven't been synced yet
      const localLogs = await this.auditDb.allDocs({
        include_docs: true,
      });

      const auditEntries = localLogs.rows.map((row) => row.doc as AuditLogEntry).filter((entry) => entry && entry.timestamp);

      if (auditEntries.length === 0) {
        console.debug("No audit logs to sync");
        return { success: true, syncedCount: 0 };
      }

      let syncedCount = 0;
      let errorCount = 0;

      // Sync in batches to avoid overwhelming the server
      const batchSize = 50;
      for (let i = 0; i < auditEntries.length; i += batchSize) {
        const batch = auditEntries.slice(i, i + batchSize);

        try {
          // Prepare batch for remote sync (remove _id and _rev for new documents)
          const batchForSync = batch.map((entry) => {
            const { _id, _rev, ...entryWithoutId } = entry;
            return entryWithoutId;
          });

          // Bulk upsert to remote database
          const bulkResult = await remoteDB.bulkDocs(batchForSync, { new_edits: false });

          // Count successful syncs
          syncedCount += bulkResult.filter((result) => !("error" in result)).length;
          errorCount += bulkResult.filter((result) => "error" in result).length;

          console.debug(
            `Synced batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(auditEntries.length / batchSize)}: ${syncedCount} successful, ${errorCount} errors`
          );
        } catch (batchError) {
          console.error("Error syncing batch:", batchError);
          errorCount += batch.length;
        }
      }

      if (errorCount > 0) {
        await this.logSyncError(new Error(`Sync completed with ${errorCount} errors`), { syncedCount, errorCount });
      }

      console.debug(`Audit log sync completed: ${syncedCount} synced, ${errorCount} errors`);
      return { success: true, syncedCount, error: errorCount > 0 ? `${errorCount} errors occurred` : undefined };
    } catch (error) {
      console.error("Failed to sync audit logs:", error);
      await this.logSyncError(error as Error, { operation: "syncAuditLogs" });
      return { success: false, syncedCount: 0, error: (error as Error).message };
    }
  }

  /**
   * Get audit logs with pagination and remote sync support
   */
  async getAuditLogs(
    options: {
      limit?: number;
      skip?: number;
      startKey?: string;
      descending?: boolean;
      includeRemote?: boolean;
    } = {}
  ): Promise<{ rows: AuditLogEntry[]; total_rows: number }> {
    const { includeRemote = false, ...paginationOptions } = options;

    // If remote is enabled and we want to include remote data, sync first
    if (this.isRemoteEnabled() && includeRemote) {
      try {
        await this.syncAuditLogs();
      } catch (error) {
        console.warn("Failed to sync audit logs before retrieval:", error);
      }
    }

    try {
      const result = await this.auditDb.allDocs({
        include_docs: true,
        limit: paginationOptions.limit || 50,
        skip: paginationOptions.skip || 0,
        startkey: paginationOptions.startKey,
        descending: paginationOptions.descending !== false, // Default to descending (newest first)
      });

      const rows = result.rows.map((row) => row.doc as AuditLogEntry).filter((doc) => doc && doc.timestamp); // Filter out any invalid docs

      return {
        rows,
        total_rows: result.total_rows || 0,
      };
    } catch (error) {
      console.error("Failed to retrieve audit logs:", error);
      return { rows: [], total_rows: 0 };
    }
  }

  /**
   * Clean up old audit logs (keep only last N days)
   */
  async cleanupOldLogs(daysToKeep = 30): Promise<{ deletedCount: number }> {
    try {
      const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

      const oldLogs = await this.auditDb.allDocs({
        include_docs: true,
        startkey: "0",
        endkey: cutoffTime.toString(),
      });

      const docsToDelete = oldLogs.rows
        .map((row) => row.doc)
        .filter(
          (doc) => doc && typeof doc === "object" && "timestamp" in doc && typeof (doc as any).timestamp === "number" && (doc as any).timestamp < cutoffTime
        )
        .map((doc) => ({ _id: (doc as any)._id, _rev: (doc as any)._rev, _deleted: true }));

      if (docsToDelete.length > 0) {
        await this.auditDb.bulkDocs(docsToDelete);
        console.debug(`Cleaned up ${docsToDelete.length} old audit log entries`);
      }

      return { deletedCount: docsToDelete.length };
    } catch (error) {
      console.error("Failed to cleanup old audit logs:", error);
      return { deletedCount: 0 };
    }
  }
}

export const auditLogService = new AuditLogService();
