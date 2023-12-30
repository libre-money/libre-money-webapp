import { sleep } from "src/utils/misc-utils";
import { credentialService } from "./credential-service";
import { useUserStore } from "src/stores/user";
import { deletionService } from "./deletion-service";
import { dialogService } from "./dialog-service";
import { configService } from "./config-service";

const userStore = useUserStore();

const LOCAL_DB_NAME = "cash-keeper-main";

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

const knownTemporaryFields = ["_currencySign"];

function stripKnownTemporaryFields(doc: any) {
  knownTemporaryFields.forEach((field) => {
    delete doc[field];
  });
}

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

  async upsertDoc(doc: PouchDB.Core.PostDocument<any>) {
    await delayIntentionally();

    doc = JSON.parse(JSON.stringify(doc));
    doc.modifiedByUsername = userStore.currentUser?.username;
    doc.modifiedEpoch = Date.now();
    stripKnownTemporaryFields(doc);
    if (doc._id) {
      return pouchdb.put(doc);
    } else {
      return pouchdb.post(doc);
    }
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

    return await pouchdb.remove(doc._id, doc._rev);
  },

  async sync() {
    return await new Promise((accept, reject) => {
      const remoteDbUrl = `${configService.getRemoteServerUrl()}/${configService.getDomainName()}`;
      const remoteDB = new PouchDB(remoteDbUrl, {
        auth: credentialService.getCredentials(),
      });

      let errorCount = 0;

      pouchdb
        .sync(remoteDB)
        .on("complete", function () {
          console.debug("Sync ended");
          accept(errorCount);
        })
        .on("denied", function (err) {
          console.error(err);
          errorCount += 1;
        })
        .on("error", function (err) {
          console.error(err);
          console.debug(err);
          console.debug("Sync error");
          reject(err);
        });
    });
  },
};
