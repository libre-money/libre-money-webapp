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

export const pouchdbService = {
  getDb() {
    return pouchdb;
  },

  async upsertDoc(doc: PouchDB.Core.PostDocument<any>) {
    if (doc._id) {
      return pouchdb.put(doc);
    } else {
      return pouchdb.post(doc);
    }
  },

  async listDocs() {
    return await pouchdb.allDocs({
      include_docs: true,
    });
  },

  async listByCollection(collectionName: string) {
    await createCollectionIndexIfNeeded();

    return await pouchdb.find({
      selector: {
        $collection: collectionName,
      },
    });
  },

  async getDocById(_id: string) {
    return await pouchdb.get(_id);
  },

  async removeDoc(doc: PouchDB.Core.PostDocument<any>) {
    return await pouchdb.remove(doc._id, doc._rev);
  },
};
