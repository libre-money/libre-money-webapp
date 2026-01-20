import { Collection, assetLiquidityList, assetTypeList } from "src/constants/constants";
import { Asset } from "src/schemas/asset";
import { Currency } from "src/schemas/currency";
import { ExpenseAvenue } from "src/schemas/expense-avenue";
import { IncomeSource } from "src/schemas/income-source";
import { Party } from "src/schemas/party";
import { Tag } from "src/schemas/tag";
import { Wallet } from "src/schemas/wallet";
import { pouchdbService } from "./pouchdb-service";

const currencyCacheList: Currency[] = [];

class EntityService {
  async getExpenseAvenue(expenseAvenueId: string) {
    const doc = (await pouchdbService.getDocById(expenseAvenueId)) as ExpenseAvenue;
    return doc;
  }

  async getExpenseAvenueByFixtureCode(fixtureCode: string) {
    const docList = (await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE)).docs as ExpenseAvenue[];
    return docList.find((expenseAvenue) => expenseAvenue.fixtureCode === fixtureCode);
  }

  async getIncomeSourceByFixtureCode(fixtureCode: string) {
    const docList = (await pouchdbService.listByCollection(Collection.INCOME_SOURCE)).docs as IncomeSource[];
    return docList.find((incomeSource) => incomeSource.fixtureCode === fixtureCode);
  }

  async getIncomeSource(incomeSourceId: string) {
    const doc = (await pouchdbService.getDocById(incomeSourceId)) as IncomeSource;
    return doc;
  }

  async getParty(partyId: string) {
    const doc = (await pouchdbService.getDocById(partyId)) as Party;
    return doc;
  }

  async getWallet(walletId: string) {
    const doc = (await pouchdbService.getDocById(walletId)) as Wallet;
    return doc;
  }

  async getAsset(assetId: string) {
    const doc = (await pouchdbService.getDocById(assetId)) as Asset;
    return doc;
  }

  async getCurrency(currencyId: string) {
    const doc = (await pouchdbService.getDocById(currencyId)) as Currency;
    return doc;
  }

  async getTagList(tagIdList: string[]) {
    const docList = (await pouchdbService.listByCollection(Collection.TAG)).docs as Tag[];
    return docList.filter((tag) => tagIdList.includes(tag._id!));
  }

  toProperAssetType(asset: Asset) {
    return assetTypeList.find((assetType) => assetType.value === asset.type)?.label;
  }

  toProperAssetLiquidity(asset: Asset) {
    return assetLiquidityList.find((assetLiquidity) => assetLiquidity.value === asset.liquidity)?.label;
  }
}

export const entityService = new EntityService();
