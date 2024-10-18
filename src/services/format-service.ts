import { Collection } from "src/constants/constants";
import { pouchdbService } from "./pouchdb-service";
import { Currency } from "src/models/currency";
import { prettifyAmount } from "src/utils/misc-utils";

let currencyCacheList: Currency[] = [];

class FormatService {

  async updateCurrencyCache() {
    currencyCacheList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
  }

  async init() {
    pouchdbService.registerChangeListener(this.onUpsert);
    await this.updateCurrencyCache();
  }

  async onUpsert(doc: PouchDB.Core.PostDocument<any> | undefined) {
    if (!doc || (doc && doc.type === Collection.CURRENCY)) {
      await this.updateCurrencyCache();
    }
  }

  getPrintableAmount(amount: number, currencyId: string) {
    const currency = currencyCacheList.find((_currency) => _currency._id === currencyId);
    return `${prettifyAmount(amount)} ${currency?.sign}`;
  }

}

export const formatService = new FormatService();
