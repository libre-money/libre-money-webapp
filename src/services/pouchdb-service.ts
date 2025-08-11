import { sleep } from "src/utils/misc-utils";
import { credentialService } from "./credential-service";
import { useUserStore } from "src/stores/user";
import { deletionService } from "./deletion-service";
import { dialogService } from "./dialog-service";
import { configService } from "./config-service";
import { auditLogService } from "./audit-log-service";

export interface SyncProgress {
  phase: "connecting" | "downloading" | "uploading" | "finalizing";
  totalDocs: number;
  docsSynced: number;
  bytesTransferred: number;
  percentage: number;
  errorCount: number;
}

const userStore = useUserStore();

const LOCAL_DB_NAME = "libre-money-main";

const pouchdb = new PouchDB(LOCAL_DB_NAME);

let collectionIndexCreated = false;
async function createCollectionIndexIfNeeded() {
  if (collectionIndexCreated) {
    return;
  }
  await pouchdb.createIndex({
    index: {
      fields: ["$collection"],
    },
  });
  collectionIndexCreated = true;
}

const knownTemporaryFields = ["_currencySign", "_usedAmount"];

function stripKnownTemporaryFields(doc: any) {
  knownTemporaryFields.forEach((field) => {
    delete doc[field];
  });
}

const changeListenerList: ((action: "upsert" | "remove" | "sync", doc: PouchDB.Core.PostDocument<any> | undefined) => void)[] = [];

const INTENTIONAL_DELAY_MS = 1;
const INTENTIONAL_DELAY_THRESHOLD = 500;
let undelayedRequestCount = 0;
let intentionalDelayIterationCount = 0;
async function delayIntentionally() {
  undelayedRequestCount += 1;
  if (undelayedRequestCount >= INTENTIONAL_DELAY_THRESHOLD) {
    intentionalDelayIterationCount += 1;
    console.debug(`intentionalDelayIterationCount: ${intentionalDelayIterationCount}`);
    await sleep(INTENTIONAL_DELAY_MS);
    undelayedRequestCount = 0;
  }
}

export const pouchdbService = {
  getDb() {
    return pouchdb;
  },

  registerChangeListener(listenerFn: (action: "upsert" | "remove" | "sync", doc: PouchDB.Core.PostDocument<any> | undefined) => void) {
    changeListenerList.push(listenerFn);
  },

  notifyChangeListeners(action: "upsert" | "remove" | "sync", doc: PouchDB.Core.PostDocument<any> | undefined) {
    changeListenerList.forEach((listener) => {
      listener(action, doc);
    });
  },

  async upsertDoc(doc: PouchDB.Core.PostDocument<any>) {
    await delayIntentionally();

    doc = JSON.parse(JSON.stringify(doc));
    doc.modifiedByUsername = userStore.currentUser?.username;
    doc.modifiedEpoch = Date.now();
    stripKnownTemporaryFields(doc);

    let oldDoc: PouchDB.Core.PostDocument<any> | undefined = undefined;
    let res;

    if (doc._id) {
      // Try to fetch the old document for audit logging
      try {
        oldDoc = await pouchdb.get(doc._id);
      } catch (error) {
        // Document doesn't exist yet, this is effectively a new document
        console.debug("Old document not found for audit logging (likely new document):", doc._id);
      }
      res = await pouchdb.put(doc);
    } else {
      res = await pouchdb.post(doc);
    }

    // Log to audit log if enabled (pass both old and new documents)
    await auditLogService.logUpsert(doc, oldDoc);

    this.notifyChangeListeners("upsert", doc);
    return res;
  },

  async listDocs() {
    await delayIntentionally();

    return await pouchdb.allDocs({
      include_docs: true,
    });
  },

  async listByCollection(collectionName: string) {
    await delayIntentionally();

    await createCollectionIndexIfNeeded();

    return await pouchdb.find({
      selector: {
        $collection: collectionName,
      },
    });
  },

  async getDocById(_id: string) {
    await delayIntentionally();

    return await pouchdb.get(_id);
  },

  async removeDoc(doc: PouchDB.Core.PostDocument<any>, forceDelete = false) {
    await delayIntentionally();

    if (!forceDelete && !(await deletionService.canDeleteDoc(doc))) {
      await dialogService.alert("Deletion failed", "The item you are trying to delete is in use by other sections on the app");
      return { ok: false };
    }

    const res = await pouchdb.remove(doc._id, doc._rev);

    // Log to audit log if enabled
    await auditLogService.logRemoval(doc);

    this.notifyChangeListeners("remove", doc);

    return res;
  },

  async sync(progressCallback?: (progress: SyncProgress) => void) {
    return await new Promise((accept, reject) => {
      const { domain, serverUrl } = configService.getServerUrlAndDomainNameOrFail();
      const remoteDbUrl = `${serverUrl}/${domain}`;
      const remoteDB = new PouchDB(remoteDbUrl, {
        auth: credentialService.getCredentials(),
      });

      let errorCount = 0;
      let totalDocsToSync = 0;
      let docsSynced = 0;
      let bytesTransferred = 0;
      let syncPhase: "connecting" | "downloading" | "uploading" | "finalizing" = "connecting";

      const updateProgress = () => {
        if (progressCallback) {
          const percentage = totalDocsToSync > 0 ? Math.round((docsSynced / totalDocsToSync) * 100) : 0;
          progressCallback({
            phase: syncPhase,
            totalDocs: totalDocsToSync,
            docsSynced: docsSynced,
            bytesTransferred: bytesTransferred,
            percentage: percentage,
            errorCount: errorCount,
          });
        }
      };

      // Initialize progress
      updateProgress();

      pouchdb
        .sync(remoteDB)
        .on("change", (info) => {
          // Track the first change event to estimate total docs
          if (totalDocsToSync === 0 && info.change && info.change.docs) {
            // Start with a reasonable estimate, will be refined as we get more changes
            totalDocsToSync = Math.max(50, info.change.docs.length * 10);
          }

          if (info.change && info.change.docs) {
            const docsInThisBatch = info.change.docs.length;
            docsSynced += docsInThisBatch;

            // Estimate bytes transferred (rough approximation)
            info.change.docs.forEach((doc) => {
              bytesTransferred += JSON.stringify(doc).length;
            });

            // Update sync phase based on direction
            if (info.direction === "pull") {
              syncPhase = "downloading";
            } else if (info.direction === "push") {
              syncPhase = "uploading";
            }

            // Adjust total estimate if we've exceeded it
            if (docsSynced > totalDocsToSync) {
              totalDocsToSync = Math.max(totalDocsToSync, docsSynced + 20);
            }

            updateProgress();
          }
        })
        .on("paused", () => {
          console.debug("Sync paused");
          syncPhase = "finalizing";
          updateProgress();
        })
        .on("active", () => {
          console.debug("Sync resumed");
          updateProgress();
        })
        .on("complete", async () => {
          console.debug("Sync ended");
          syncPhase = "finalizing";

          // Ensure we show 100% completion
          if (totalDocsToSync > 0) {
            docsSynced = totalDocsToSync;
          }
          updateProgress();

          // Log to audit log if enabled
          await auditLogService.logSync();

          accept(errorCount);
          this.notifyChangeListeners("sync", undefined);
        })
        .on("denied", (err) => {
          console.error(err);
          errorCount += 1;
          updateProgress();
        })
        .on("error", (err) => {
          console.error(err);
          console.debug(err);
          console.debug("Sync error");
          reject(err);

          this.notifyChangeListeners("sync", undefined);
        });
    });
  },
};
