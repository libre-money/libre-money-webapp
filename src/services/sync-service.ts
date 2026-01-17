import { ref } from "vue";
import { credentialService } from "./credential-service";
import { pouchdbService } from "./pouchdb-service";
import { useUserStore } from "src/stores/user";
import { QVueGlobals } from "quasar";
import { auditLogService } from "./audit-log-service";

export type SyncInvocationOrigin = "background" | "LoginPage" | "GoOnlinePage" | "MainLayout" | "InitialSyncPage";

export interface SyncStatus {
  isBackgroundSyncing: boolean;
  isFullSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncError: string | null;
}

export interface SyncRequest {
  syncType: "full" | "background";
  initTimestamp: number;
  completionCallback: ((result: boolean) => void) | null;
  reloadWindowAfterSync: boolean;
  invocationOrigin: SyncInvocationOrigin;
}

class SyncService {
  private syncQueue: SyncRequest[] = [];
  private isProcessingQueue = false;
  private syncStatus = ref<SyncStatus>({
    isBackgroundSyncing: false,
    isFullSyncing: false,
    lastSyncTime: null,
    lastSyncError: null,
  });

  private $q: QVueGlobals | null = null;

  // Reactive getter for sync status
  public get status() {
    return this.syncStatus;
  }

  // Entry point for full sync - delegates to SyncDialog for UI and credential handling
  doFullSync($q: QVueGlobals, reloadWindowAfterSync: boolean, invocationOrigin: SyncInvocationOrigin): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.$q = $q;
      const syncRequest: SyncRequest = {
        syncType: "full",
        initTimestamp: Date.now(),
        completionCallback: resolve,
        reloadWindowAfterSync,
        invocationOrigin,
      };

      this.syncQueue.push(syncRequest);
      this.processQueue();
    });
  }

  // Entry point for background sync - silent, graceful failure if no credentials
  doBackgroundSync(): void {
    const syncRequest: SyncRequest = {
      syncType: "background",
      initTimestamp: Date.now(),
      completionCallback: null,
      reloadWindowAfterSync: false,
      invocationOrigin: "background",
    };

    this.syncQueue.push(syncRequest);
    this.processQueue();
  }

  // Queue processor - processes sync requests sequentially
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.syncQueue.length > 0) {
      const syncRequest = this.syncQueue.shift()!;
      await this.processSyncRequest(syncRequest);
    }

    this.isProcessingQueue = false;
  }

  // Process individual sync request
  private async processSyncRequest(syncRequest: SyncRequest): Promise<void> {
    console.debug(`Processing sync request: ${syncRequest.syncType} (initiated at ${new Date(syncRequest.initTimestamp)})`);

    if (syncRequest.syncType === "background") {
      await this.performBackgroundSync();
    } else if (syncRequest.syncType === "full") {
      await this.performFullSync(syncRequest);
    }
  }

  // Perform background sync - silent, graceful failure
  private async performBackgroundSync(): Promise<void> {
    this.syncStatus.value.isBackgroundSyncing = true;
    this.syncStatus.value.lastSyncError = null;

    try {
      const userStore = useUserStore();

      // Gracefully fail if not logged in or no credentials
      if (!userStore.isUserLoggedIn || !credentialService.hasCredentials()) {
        console.debug("Background sync skipped: user not logged in or no credentials");
        return;
      }

      const errorCount = (await pouchdbService.sync()) as number;
      this.syncStatus.value.lastSyncTime = new Date();

      // Also sync audit logs in background
      try {
        await auditLogService.syncAuditLogs();
      } catch (auditSyncError) {
        console.warn("Background audit log sync failed:", auditSyncError);
      }

      if (errorCount > 0) {
        console.warn(`Background sync completed with ${errorCount} non-fatal errors`);
      } else {
        console.debug("Background sync completed successfully");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown sync error";
      this.syncStatus.value.lastSyncError = errorMessage;
      console.debug("Background sync failed:", error);

      // Log sync error to audit log
      if (error instanceof Error) {
        await auditLogService.logSyncError(error, {
          syncType: "background",
          invocationOrigin: "background",
        });
      }
    } finally {
      this.syncStatus.value.isBackgroundSyncing = false;
    }
  }

  // Perform full sync - delegates to SyncDialog for actual sync
  private async performFullSync(syncRequest: SyncRequest): Promise<void> {
    this.syncStatus.value.isFullSyncing = true;

    try {
      // Import SyncDialog dynamically to avoid circular dependencies
      const SyncDialog = (await import("../components/SyncDialog.vue")).default;

      // Let SyncDialog handle the full sync including credential collection
      this.$q!.dialog({
        component: SyncDialog,
        componentProps: {
          bidirectional: true,
          reloadWindowAfterSync: syncRequest.reloadWindowAfterSync,
          invocationOrigin: syncRequest.invocationOrigin,
        },
      }).onDismiss(() => {
        if (syncRequest.completionCallback) {
          syncRequest.completionCallback(true);
        }
      });
    } finally {
      this.syncStatus.value.isFullSyncing = false;
    }
  }

  // Check if any sync is currently running
  public isSyncing(): boolean {
    return this.syncStatus.value.isBackgroundSyncing || this.syncStatus.value.isFullSyncing;
  }

  // Trigger automatic background sync (e.g., after user makes changes)
  triggerAutoBackgroundSync(delayMs = 5000): void {
    // Don't trigger immediately if already syncing or processing queue
    if (this.isSyncing() || this.isProcessingQueue) {
      setTimeout(() => {
        console.debug("Triggering automatic background sync...");
        this.doBackgroundSync();
      }, delayMs);
      return;
    }

    // Trigger immediately if not syncing or processing queue
    console.debug("Triggering automatic background sync...");
    this.doBackgroundSync();
  }

  setUpPouchdbListener() {
    pouchdbService.registerChangeListener((...args) => this.onPouchdbChange(...args));
  }

  onPouchdbChange(action: "upsert" | "remove" | "sync", doc: PouchDB.Core.PostDocument<any> | undefined) {
    console.debug("Pouchdb change:", action, doc);
    if (action !== "sync") {
      this.triggerAutoBackgroundSync();
    }
  }
}

export const syncService = new SyncService();
