import { credentialService } from "./credential-service";
import { configService } from "./config-service";
import { useUserStore } from "src/stores/user";
import { deepClone } from "src/utils/misc-utils";
import axios from "axios";

export interface AuditLogEntry {
  _id?: string;
  _rev?: string;
  timestamp: number;
  action: "upsert" | "remove" | "sync" | "sync-error";
  documentId?: string;
  documentCollection?: string;
  documentData?: any; // For backward compatibility and remove/sync actions
  oldDocumentData?: any; // For upsert actions - the document before changes
  newDocumentData?: any; // For upsert actions - the document after changes
  errorMessage?: string; // For sync-error actions
  errorDetails?: any; // For sync-error actions - additional error context
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
      // TODO: Perform background sync
    }
    this.setupNextBackgroundSync();
  }

  private setupNextBackgroundSync() {
    // TODO: Uncomment this when we have a way to perform background sync
    // setTimeout(() => this.performBackgroundSync(), BACKGROUND_SYNC_INTERVAL_MS);
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
   * Sync audit logs to remote database (placeholder for future implementation)
   */
  async syncAuditLogs(): Promise<void> {
    // TODO: Implement remote sync functionality
    console.debug("Audit log sync requested - not yet implemented");
  }

  /**
   * Get audit logs with pagination
   */
  async getAuditLogs(
    options: {
      limit?: number;
      skip?: number;
      startKey?: string;
      descending?: boolean;
    } = {}
  ): Promise<{ rows: AuditLogEntry[]; total_rows: number }> {
    if (!this.isRemoteEnabled()) {
      return { rows: [], total_rows: 0 };
    }

    try {
      const result = await this.auditDb.allDocs({
        include_docs: true,
        limit: options.limit || 50,
        skip: options.skip || 0,
        startkey: options.startKey,
        descending: options.descending !== false, // Default to descending (newest first)
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
}

export const auditLogService = new AuditLogService();
