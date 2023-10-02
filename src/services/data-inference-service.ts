import { Collection, RecordType } from "src/constants/constants";
import { ExpenseAvenue } from "src/models/expense-avenue";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { Record } from "src/models/record";
import { asAmount, deepClone } from "src/utils/misc-utils";
import { pouchdbService } from "./pouchdb-service";
import { Party } from "src/models/party";
import { Tag } from "src/models/tag";
import { Currency } from "src/models/currency";
import { Wallet } from "src/models/wallet";
import { IncomeSource } from "src/models/income-source";
import { Asset } from "src/models/asset";

let currencyCacheList: Currency[] = [];

class DataInferenceService {
  async updateCurrencyCache() {
    currencyCacheList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
  }

  prettifyAmount(amount: number, currencyId: string) {
    const currency = currencyCacheList.find((_currency) => _currency._id === currencyId);
    return `${asAmount(amount)} ${currency!.sign}`;
  }

  async inferRecord(record: Record): Promise<InferredRecord> {
    const inferredRecord = deepClone(record) as InferredRecord;

    (await this.inferExpense(inferredRecord)) ||
      (await this.inferIncome(inferredRecord)) ||
      (await this.inferMoneyTransfer(inferredRecord)) ||
      (await this.inferLending(inferredRecord)) ||
      (await this.inferBorrowing(inferredRecord)) ||
      (await this.inferRepaymentGiven(inferredRecord)) ||
      (await this.inferRepaymentReceived(inferredRecord)) ||
      (await this.inferAssetPurchase(inferredRecord)) ||
      (await this.inferAssetSale(inferredRecord)) ||
      (await this.inferAssetAppreciationDepreciation(inferredRecord));

    inferredRecord.typePrettified = inferredRecord.type.replace(/\-/g, " ");
    inferredRecord.tagList = await this.getTagList(inferredRecord.tagIdList);

    return inferredRecord;
  }

  private async inferExpense(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.EXPENSE && inferredRecord.expense)) return false;

    inferredRecord.expense.expenseAvenue = await this.getExpenseAvenue(inferredRecord.expense.expenseAvenueId);

    if (inferredRecord.expense.partyId) {
      inferredRecord.expense.party = await this.getParty(inferredRecord.expense.partyId);
    }

    if (inferredRecord.expense.walletId) {
      inferredRecord.expense.wallet = await this.getWallet(inferredRecord.expense.walletId);
    }
    return true;
  }

  private async inferIncome(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.INCOME && inferredRecord.income)) return false;

    inferredRecord.income.incomeSource = await this.getExpenseAvenue(inferredRecord.income.incomeSourceId);

    if (inferredRecord.income.partyId) {
      inferredRecord.income.party = await this.getParty(inferredRecord.income.partyId);
    }

    if (inferredRecord.income.walletId) {
      inferredRecord.income.wallet = await this.getWallet(inferredRecord.income.walletId);
    }

    return true;
  }

  private async inferMoneyTransfer(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.MONEY_TRANSFER && inferredRecord.moneyTransfer)) return false;

    if (inferredRecord.moneyTransfer.fromWalletId) {
      inferredRecord.moneyTransfer.fromWallet = await this.getWallet(inferredRecord.moneyTransfer.fromWalletId);
    }
    if (inferredRecord.moneyTransfer.toWalletId) {
      inferredRecord.moneyTransfer.toWallet = await this.getWallet(inferredRecord.moneyTransfer.toWalletId);
    }

    return true;
  }

  private async inferLending(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.LENDING && inferredRecord.lending)) return false;

    if (inferredRecord.lending.partyId) {
      inferredRecord.lending.party = await this.getParty(inferredRecord.lending.partyId);
    }

    if (inferredRecord.lending.walletId) {
      inferredRecord.lending.wallet = await this.getWallet(inferredRecord.lending.walletId);
    }

    return true;
  }

  private async inferBorrowing(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.BORROWING && inferredRecord.borrowing)) return false;

    if (inferredRecord.borrowing.partyId) {
      inferredRecord.borrowing.party = await this.getParty(inferredRecord.borrowing.partyId);
    }

    if (inferredRecord.borrowing.walletId) {
      inferredRecord.borrowing.wallet = await this.getWallet(inferredRecord.borrowing.walletId);
    }

    return true;
  }

  private async inferRepaymentGiven(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.REPAYMENT_GIVEN && inferredRecord.repaymentGiven)) return false;

    if (inferredRecord.repaymentGiven.partyId) {
      inferredRecord.repaymentGiven.party = await this.getParty(inferredRecord.repaymentGiven.partyId);
    }

    if (inferredRecord.repaymentGiven.walletId) {
      inferredRecord.repaymentGiven.wallet = await this.getWallet(inferredRecord.repaymentGiven.walletId);
    }

    return true;
  }

  private async inferRepaymentReceived(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.REPAYMENT_RECEIVED && inferredRecord.repaymentReceived)) return false;

    if (inferredRecord.repaymentReceived.partyId) {
      inferredRecord.repaymentReceived.party = await this.getParty(inferredRecord.repaymentReceived.partyId);
    }

    if (inferredRecord.repaymentReceived.walletId) {
      inferredRecord.repaymentReceived.wallet = await this.getWallet(inferredRecord.repaymentReceived.walletId);
    }

    return true;
  }

  private async inferAssetPurchase(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.ASSET_PURCHASE && inferredRecord.assetPurchase)) return false;

    if (inferredRecord.assetPurchase.partyId) {
      inferredRecord.assetPurchase.party = await this.getParty(inferredRecord.assetPurchase.partyId);
    }

    if (inferredRecord.assetPurchase.walletId) {
      inferredRecord.assetPurchase.wallet = await this.getWallet(inferredRecord.assetPurchase.walletId);
    }

    if (inferredRecord.assetPurchase.assetId) {
      inferredRecord.assetPurchase.asset = await this.getAsset(inferredRecord.assetPurchase.assetId);
    }

    return true;
  }

  private async inferAssetSale(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.ASSET_SALE && inferredRecord.assetSale)) return false;

    if (inferredRecord.assetSale.partyId) {
      inferredRecord.assetSale.party = await this.getParty(inferredRecord.assetSale.partyId);
    }

    if (inferredRecord.assetSale.walletId) {
      inferredRecord.assetSale.wallet = await this.getWallet(inferredRecord.assetSale.walletId);
    }

    if (inferredRecord.assetSale.assetId) {
      inferredRecord.assetSale.asset = await this.getAsset(inferredRecord.assetSale.assetId);
    }

    return true;
  }

  private async inferAssetAppreciationDepreciation(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.ASSET_APPRECIATION_DEPRECIATION && inferredRecord.assetAppreciationDepreciation)) return false;

    if (inferredRecord.assetAppreciationDepreciation.assetId) {
      inferredRecord.assetAppreciationDepreciation.asset = await this.getAsset(inferredRecord.assetAppreciationDepreciation.assetId);
    }

    return true;
  }

  async getExpenseAvenue(expenseAvenueId: string) {
    const doc = (await pouchdbService.getDocById(expenseAvenueId)) as ExpenseAvenue;
    return doc;
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
}

export const dataInferenceService = new DataInferenceService();
