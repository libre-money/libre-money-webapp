import { Collection } from "src/constants/constants";
import { Currency } from "src/models/currency";
import { formatCurrency, NumberValue, CurrencyFormatOptions, isNonNegativeNumber } from "src/utils/number-utils";
import { pouchdbService } from "./pouchdb-service";

let currencyCacheList: Currency[] = [];

class CurrencyFormatService {
  async updateCurrencyCache() {
    currencyCacheList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
  }

  async init() {
    pouchdbService.registerChangeListener(this.onUpsert);
    await this.updateCurrencyCache();
  }

  async onUpsert(action: "upsert" | "remove" | "sync", doc: PouchDB.Core.PostDocument<any> | undefined) {
    if (!doc || (doc && doc.type === Collection.CURRENCY)) {
      await this.updateCurrencyCache();
    }
  }

  getPrintableCurrencySign(currencyId: string): string {
    const currency = currencyCacheList.find((_currency) => _currency._id === currencyId);
    return currency?.sign || "";
  }

  getPrintableAmountWithCurrency(amount: NumberValue, currencyId: string): string {
    const currency = currencyCacheList.find((_currency) => _currency._id === currencyId);
    return formatCurrency(amount, currency?.sign || "");
  }

  getPrintableAmountWithCurrencyAndConfiguration(amount: NumberValue, currencyId: string, options: CurrencyFormatOptions): string {
    const currency = currencyCacheList.find((_currency) => _currency._id === currencyId);
    if (currency && isNonNegativeNumber(currency.precisionMinimum) && isNonNegativeNumber(currency.precisionMaximum)) {
      options.minimumFractionDigits = currency.precisionMinimum;
      options.maximumFractionDigits = currency.precisionMaximum;
    }
    return formatCurrency(amount, currency?.sign || "", options);
  }
}

export const currencyFormatService = new CurrencyFormatService();
