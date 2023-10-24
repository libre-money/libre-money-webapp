import { pouchdbService } from "./pouchdb-service";

export const deletionService = {
  async canDeleteDoc(candidateDoc: PouchDB.Core.PostDocument<any>): Promise<boolean> {
    const res = await pouchdbService.listDocs();
    const docList = res.rows;

    let matchedCount = 0;
    for (const doc of docList) {
      const docString = JSON.stringify(doc);
      if (docString.includes(candidateDoc._id)) {
        matchedCount += 1;
      }

      if (matchedCount >= 2) {
        return false;
      }
    }

    return true;
  },
};
