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
import { LoanAndDebtSummary } from "src/models/inferred/loan-and-debt-summary";
import { Overview } from "src/models/inferred/overview";
import { dataInferenceService } from "./data-inference-service";

let currencyCacheList: Currency[] = [];

class ComputationService {
  async updateCurrencyCache() {
    currencyCacheList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
  }

  async computeBalancesForAssets(assetList: Asset[]): Promise<void> {
    const res2 = await pouchdbService.listByCollection(Collection.RECORD);
    const recordList = res2.docs as Record[];

    assetList.forEach((asset) => {
      const totalPurchases = recordList
        .filter((record) => record.type === RecordType.ASSET_PURCHASE && record.assetPurchase?.assetId === asset._id)
        .reduce((sum, record) => sum + record.assetPurchase!.amount, 0);

      const totalSales = recordList
        .filter((record) => record.type === RecordType.ASSET_SALE && record.assetSale?.assetId === asset._id)
        .reduce((sum, record) => sum + record.assetSale!.amount, 0);

      const totalAppreciation = recordList
        .filter((record) => record.type === RecordType.ASSET_APPRECIATION_DEPRECIATION && record.assetAppreciationDepreciation?.assetId === asset._id)
        .reduce(
          (sum, record) => sum + record.assetAppreciationDepreciation!.amount * (record.assetAppreciationDepreciation!.type === "appreciation" ? 1 : -1),
          0
        );

      asset._balance = totalPurchases - totalSales + totalAppreciation;
    });
  }

  async prepareLoanAndDebtSummary(): Promise<LoanAndDebtSummary[]> {
    let res = await pouchdbService.listByCollection(Collection.PARTY);
    const partyList = res.docs as Party[];

    res = await pouchdbService.listByCollection(Collection.RECORD);
    const recordList = res.docs as Record[];

    res = await pouchdbService.listByCollection(Collection.CURRENCY);
    const currencyList = res.docs as Currency[];

    const loanAndDebtSummaryList: LoanAndDebtSummary[] = [];

    for (const currency of currencyList) {
      for (const party of partyList) {
        const partyId = party._id!;

        const totalLoansGivenToParty = recordList
          .filter((record) => record.type === RecordType.LENDING && record.lending?.partyId === partyId && record.lending?.currencyId === currency._id)
          .reduce((sum, record) => sum + record.lending!.amount, 0);

        const totalLoansTakenFromParty = recordList
          .filter((record) => record.type === RecordType.BORROWING && record.borrowing?.partyId === partyId && record.borrowing?.currencyId === currency._id)
          .reduce((sum, record) => sum + record.borrowing!.amount, 0);

        const totalRepaidToParty = recordList
          .filter(
            (record) =>
              record.type === RecordType.REPAYMENT_GIVEN && record.repaymentGiven?.partyId === partyId && record.repaymentGiven?.currencyId === currency._id
          )
          .reduce((sum, record) => sum + record.repaymentGiven!.amount, 0);

        const totalRepaidByParty = recordList
          .filter(
            (record) =>
              record.type === RecordType.REPAYMENT_RECEIVED &&
              record.repaymentReceived?.partyId === partyId &&
              record.repaymentReceived?.currencyId === currency._id
          )
          .reduce((sum, record) => sum + record.repaymentReceived!.amount, 0);

        let totalOwedToParty = totalLoansTakenFromParty - totalLoansGivenToParty + totalRepaidByParty - totalRepaidToParty;
        let totalOwedByParty = 0;
        if (totalOwedToParty < 0) {
          totalOwedByParty = totalOwedToParty * -1;
          totalOwedToParty = 0;
        }

        const summary: LoanAndDebtSummary = {
          partyId,
          partyName: party.name,
          totalLoansGivenToParty,
          totalLoansTakenFromParty,
          totalRepaidByParty,
          totalRepaidToParty,
          totalOwedToParty,
          totalOwedByParty,
          currencyId: currency._id!,
          currencySign: currency.sign,
        };

        if (summary.totalLoansGivenToParty > 0 || summary.totalLoansTakenFromParty > 0 || summary.totalOwedToParty > 0 || summary.totalOwedByParty > 0) {
          loanAndDebtSummaryList.push(summary);
        }
      }
    }

    return loanAndDebtSummaryList;
  }

  async computeOverview(startEpoch: number, endEpoch: number, currencyId: string): Promise<Overview> {
    await dataInferenceService.updateCurrencyCache();

    // ============== Preparation

    let res = await pouchdbService.listByCollection(Collection.RECORD);
    const fullRecordList = res.docs as Record[];

    res = await pouchdbService.listByCollection(Collection.PARTY);
    const partyList = res.docs as Party[];

    res = await pouchdbService.listByCollection(Collection.CURRENCY);
    const currencyList = res.docs as Currency[];

    res = await pouchdbService.listByCollection(Collection.WALLET);
    const walletList = res.docs as Wallet[];

    res = await pouchdbService.listByCollection(Collection.INCOME_SOURCE);
    const incomeSourceList = res.docs as IncomeSource[];

    res = await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE);
    const expenseAvenueList = res.docs as ExpenseAvenue[];

    const recordList = fullRecordList.filter((record) => {
      if (record.income && record.income.currencyId === currencyId) return true;
      if (record.expense && record.expense.currencyId === currencyId) return true;
      if (record.lending && record.lending.currencyId === currencyId) return true;
      if (record.borrowing && record.borrowing.currencyId === currencyId) return true;
      if (record.repaymentGiven && record.repaymentGiven.currencyId === currencyId) return true;
      if (record.repaymentReceived && record.repaymentReceived.currencyId === currencyId) return true;
      if (record.assetPurchase && record.assetPurchase.currencyId === currencyId) return true;
      if (record.assetSale && record.assetSale.currencyId === currencyId) return true;
      if (record.assetAppreciationDepreciation && record.assetAppreciationDepreciation.currencyId === currencyId) return true;
      if (record.moneyTransfer && record.moneyTransfer.fromCurrencyId === currencyId) return true;
      if (record.moneyTransfer && record.moneyTransfer.toCurrencyId === currencyId) return true;
    });

    // ============== Cached Fetcher

    const getCurrency = (id: string) => currencyList.find((item) => item._id === id);

    const getIncomeSource = (id: string) => incomeSourceList.find((item) => item._id === id);

    const getExpenseAvenue = (id: string) => expenseAvenueList.find((item) => item._id === id);

    // ============== Overview

    const overview: Overview = {
      currency: getCurrency(currencyId)!,
      startEpoch,
      endEpoch,

      income: {
        list: [],
        grandSum: 0,
        totalTransactionCount: 0,
      },
      expense: {
        list: [],
        grandSum: 0,
        totalTransactionCount: 0,
      },
      wallets: {
        list: [],
        sumOfBalances: 0,
        totalTransactionCount: 0,
      },
    };

    // ============== Income

    {
      const finerRecordList = recordList.filter((record) => record.type === RecordType.INCOME && record.income);
      const map: any = {};
      for (const record of finerRecordList) {
        const incomeSourceId = record.income!.incomeSourceId;
        const currencyId = record.income!.currencyId;

        const key = `${incomeSourceId}`;
        if (!Object.hasOwn(map, incomeSourceId)) {
          map[key] = {
            incomeSourceId,
            currencyId,
            sum: 0,
            transactionCount: 0,
            incomeSource: getIncomeSource(incomeSourceId),
          };
        }

        map[key].sum += record.income!.amount;
        map[key].transactionCount += 1;
      }

      Object.keys(map).forEach((key) => {
        overview.income.list.push(map[key]);
        overview.income.grandSum += map[key].sum;
        overview.income.totalTransactionCount += map[key].transactionCount;
      });
    }

    // ============== Expense

    {
      const finerRecordList = recordList.filter((record) => record.type === RecordType.EXPENSE && record.expense);
      const map: any = {};
      for (const record of finerRecordList) {
        const expenseAvenueId = record.expense!.expenseAvenueId;
        const currencyId = record.expense!.currencyId;

        const key = `${expenseAvenueId}`;
        if (!Object.hasOwn(map, expenseAvenueId)) {
          map[key] = {
            expenseAvenueId,
            currencyId,
            sum: 0,
            transactionCount: 0,
            expenseAvenue: getExpenseAvenue(expenseAvenueId),
          };
        }

        map[key].sum += record.expense!.amount;
        map[key].transactionCount += 1;
      }

      Object.keys(map).forEach((key) => {
        overview.expense.list.push(map[key]);
        overview.expense.grandSum += map[key].sum;
        overview.expense.totalTransactionCount += map[key].transactionCount;
      });
    }

    // ============== Wallet

    {
      const map: any = {};
      for (const wallet of walletList) {
        const key = `${wallet._id}`;
        map[key] = {
          walletId: wallet._id,
          wallet: wallet,
          balance: asAmount(wallet.initialBalance),
        };

        map[key].balance += recordList
          .filter((record) => record.type === RecordType.INCOME && record.income?.walletId === wallet._id)
          .reduce((balance, record) => balance + asAmount(record.income?.amountPaid), 0);

        map[key].balance += recordList
          .filter((record) => record.type === RecordType.EXPENSE && record.expense?.walletId === wallet._id)
          .reduce((balance, record) => balance - asAmount(record.expense?.amountPaid), 0);

        map[key].balance += recordList
          .filter((record) => record.type === RecordType.ASSET_PURCHASE && record.assetPurchase?.walletId === wallet._id)
          .reduce((balance, record) => balance - asAmount(record.assetPurchase?.amountPaid), 0);

        map[key].balance += recordList
          .filter((record) => record.type === RecordType.ASSET_SALE && record.assetSale?.walletId === wallet._id)
          .reduce((balance, record) => balance + asAmount(record.assetSale?.amountPaid), 0);

        map[key].balance += recordList
          .filter((record) => record.type === RecordType.LENDING && record.lending?.walletId === wallet._id)
          .reduce((balance, record) => balance - asAmount(record.lending?.amount), 0);

        map[key].balance += recordList
          .filter((record) => record.type === RecordType.BORROWING && record.borrowing?.walletId === wallet._id)
          .reduce((balance, record) => balance + asAmount(record.borrowing?.amount), 0);

        map[key].balance += recordList
          .filter((record) => record.type === RecordType.REPAYMENT_GIVEN && record.repaymentGiven?.walletId === wallet._id)
          .reduce((balance, record) => balance - asAmount(record.repaymentGiven?.amount), 0);

        map[key].balance += recordList
          .filter((record) => record.type === RecordType.REPAYMENT_RECEIVED && record.repaymentReceived?.walletId === wallet._id)
          .reduce((balance, record) => balance + asAmount(record.repaymentReceived?.amount), 0);

        map[key].balance += recordList
          .filter(
            (record) =>
              record.type === RecordType.MONEY_TRANSFER &&
              record.moneyTransfer?.fromWalletId === wallet._id &&
              record.moneyTransfer?.fromCurrencyId === currencyId
          )
          .reduce((balance, record) => balance - asAmount(record.moneyTransfer?.fromAmount), 0);

        map[key].balance += recordList
          .filter(
            (record) =>
              record.type === RecordType.MONEY_TRANSFER && record.moneyTransfer?.toWalletId === wallet._id && record.moneyTransfer?.toCurrencyId === currencyId
          )
          .reduce((balance, record) => balance + asAmount(record.moneyTransfer?.toAmount), 0);
      }

      Object.keys(map).forEach((key) => {
        overview.wallets.list.push(map[key]);
        overview.wallets.sumOfBalances += map[key].balance;
      });
    }

    return overview;
  }
}

export const computationService = new ComputationService();
