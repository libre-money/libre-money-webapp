import { Collection, RecordType } from "src/constants/constants";
import { ExpenseAvenue } from "src/models/expense-avenue";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { Record } from "src/models/record";
import { asAmount, deepClone } from "src/utils/misc-utils";
import { pouchdbService } from "./pouchdb-service";
import { Party } from "src/models/party";
import { Tag } from "src/models/tag";
import { Currency } from "src/models/currency";
import { assert } from "console";

let currencyCacheList: Currency[] = [];

export const dataInferenceService = {
  async updateCurrencyCache() {
    currencyCacheList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
  },

  prettifyAmount(amount: number, currencyId: string) {
    const currency = currencyCacheList.find((_currency) => _currency._id === currencyId);
    return `${asAmount(amount)} ${currency!.sign}`;
  },

  async inferRecord(record: Record): Promise<InferredRecord> {
    const inferredRecord = deepClone(record) as InferredRecord;

    if (inferredRecord.type === RecordType.EXPENSE && inferredRecord.expense) {
      inferredRecord.expense.expenseAvenue = await this.getExpenseAvenue(inferredRecord.expense.expenseAvenueId);

      if (inferredRecord.expense.partyId) {
        inferredRecord.expense.party = await this.getParty(inferredRecord.expense.partyId);
      }
    }

    inferredRecord.tagList = await this.getTagList(inferredRecord.tagIdList);

    return inferredRecord;
  },

  async getExpenseAvenue(expenseAvenueId: string) {
    const doc = (await pouchdbService.getDocById(expenseAvenueId)) as ExpenseAvenue;
    return doc;
  },

  async getParty(partyId: string) {
    const doc = (await pouchdbService.getDocById(partyId)) as Party;
    return doc;
  },

  async getTagList(tagIdList: string[]) {
    const docList = (await pouchdbService.listByCollection(Collection.TAG)).docs as Tag[];
    return docList.filter((tag) => tagIdList.includes(tag._id!));
  },
};
