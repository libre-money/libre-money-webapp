import { Collection, RecordType, assetLiquidityList } from "src/constants/constants";
import { Asset } from "src/schemas/asset";
import { Currency } from "src/schemas/currency";
import { ExpenseAvenue } from "src/schemas/expense-avenue";
import { IncomeSource } from "src/schemas/income-source";
import { LoanAndDebtSummary } from "src/models/inferred/loan-and-debt-summary";
import { Overview } from "src/models/inferred/overview";
import { QuickSummary } from "src/models/inferred/quick-summary";
import { Party } from "src/schemas/party";
import { Record } from "src/schemas/record";
import { Wallet } from "src/schemas/wallet";
import { normalizeEpochAsDateAtTheEndOfDay, normalizeEpochAsDate, normalizeEpochRange } from "src/utils/date-utils";
import { isNullOrUndefined } from "src/utils/misc-utils";
import { asAmount } from "src/utils/de-facto-utils";
import { pouchdbService } from "./pouchdb-service";
import { QuickExpenseSummary } from "src/models/inferred/quick-expense-summary";
import { entityService } from "./entity-service";
import { RollingBudget } from "src/schemas/rolling-budget";
import { PayableItem } from "src/models/inferred/payable-item";
import { ReceivableItem } from "src/models/inferred/receivable-item";
import { LoanGivenItem } from "src/models/inferred/loan-given-item";
import { LoanTakenItem } from "src/models/inferred/loan-taken-item";

class ComputationService {
  async computeBalancesForAssets(assetList: Asset[]): Promise<void> {
    const res2 = await pouchdbService.listByCollection(Collection.RECORD);
    const recordList = res2.docs as Record[];

    assetList.forEach((asset) => {
      const initialBalance = asAmount(asset.initialBalance);

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

      asset._balance = initialBalance + totalPurchases - totalSales + totalAppreciation;
    });
  }

  async computeBalancesForWallets(walletList: Wallet[]): Promise<void> {
    const res = await pouchdbService.listByCollection(Collection.RECORD);
    const recordList = res.docs as Record[];

    for (const wallet of walletList) {
      wallet._balance = asAmount(wallet.initialBalance);

      wallet._balance += recordList
        .filter((record) => record.type === RecordType.INCOME && record.income?.walletId === wallet._id)
        .reduce((balance, record) => balance + asAmount(record.income?.amountPaid), 0);

      wallet._balance += recordList
        .filter((record) => record.type === RecordType.EXPENSE && record.expense?.walletId === wallet._id)
        .reduce((balance, record) => balance - asAmount(record.expense?.amountPaid), 0);

      wallet._balance += recordList
        .filter((record) => record.type === RecordType.ASSET_PURCHASE && record.assetPurchase?.walletId === wallet._id)
        .reduce((balance, record) => balance - asAmount(record.assetPurchase?.amountPaid), 0);

      wallet._balance += recordList
        .filter((record) => record.type === RecordType.ASSET_SALE && record.assetSale?.walletId === wallet._id)
        .reduce((balance, record) => balance + asAmount(record.assetSale?.amountPaid), 0);

      wallet._balance += recordList
        .filter((record) => record.type === RecordType.LENDING && record.lending?.walletId === wallet._id)
        .reduce((balance, record) => balance - asAmount(record.lending?.amount), 0);

      wallet._balance += recordList
        .filter((record) => record.type === RecordType.BORROWING && record.borrowing?.walletId === wallet._id)
        .reduce((balance, record) => balance + asAmount(record.borrowing?.amount), 0);

      wallet._balance += recordList
        .filter((record) => record.type === RecordType.REPAYMENT_GIVEN && record.repaymentGiven?.walletId === wallet._id)
        .reduce((balance, record) => balance - asAmount(record.repaymentGiven?.amount), 0);

      wallet._balance += recordList
        .filter((record) => record.type === RecordType.REPAYMENT_RECEIVED && record.repaymentReceived?.walletId === wallet._id)
        .reduce((balance, record) => balance + asAmount(record.repaymentReceived?.amount), 0);

      wallet._balance += recordList
        .filter((record) => record.type === RecordType.MONEY_TRANSFER && record.moneyTransfer?.fromWalletId === wallet._id)
        .reduce((balance, record) => balance - asAmount(record.moneyTransfer?.fromAmount), 0);

      wallet._balance += recordList
        .filter((record) => record.type === RecordType.MONEY_TRANSFER && record.moneyTransfer?.toWalletId === wallet._id)
        .reduce((balance, record) => balance + asAmount(record.moneyTransfer?.toAmount), 0);

      // Handle PAYABLE_PAYMENT (reduces wallet balance when paying payables, unless it's a write-off)
      wallet._balance += recordList
        .filter((record) => record.type === RecordType.PAYABLE_PAYMENT && record.payablePayment?.walletId === wallet._id && record.payablePayment?.walletId !== "write-off")
        .reduce((balance, record) => balance - asAmount(record.payablePayment?.amount), 0);

      // Handle RECEIVABLE_RECEIPT (increases wallet balance when receiving payments, unless it's a write-off)
      wallet._balance += recordList
        .filter((record) => record.type === RecordType.RECEIVABLE_RECEIPT && record.receivableReceipt?.walletId === wallet._id && record.receivableReceipt?.walletId !== "write-off")
        .reduce((balance, record) => balance + asAmount(record.receivableReceipt?.amount), 0);
    }
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

        const totalLoanForgivenessGiven = recordList
          .filter(
            (record) =>
              record.type === RecordType.LOAN_FORGIVENESS_GIVEN &&
              record.loanForgivenessGiven?.partyId === partyId &&
              record.loanForgivenessGiven?.currencyId === currency._id
          )
          .reduce((sum, record) => sum + record.loanForgivenessGiven!.amountForgiven, 0);

        const totalLoanForgivenessReceived = recordList
          .filter(
            (record) =>
              record.type === RecordType.LOAN_FORGIVENESS_RECEIVED &&
              record.loanForgivenessReceived?.partyId === partyId &&
              record.loanForgivenessReceived?.currencyId === currency._id
          )
          .reduce((sum, record) => sum + record.loanForgivenessReceived!.amountForgiven, 0);

        const incomeReceivable = recordList
          .filter((record) => record.type === RecordType.INCOME && record.income?.partyId === party._id && record.income?.currencyId === currency._id)
          .reduce((sum, record) => sum + record.income!.amountUnpaid, 0);

        const salesReceivable = recordList
          .filter((record) => record.type === RecordType.ASSET_SALE && record.assetSale?.partyId === party._id && record.assetSale?.currencyId === currency._id)
          .reduce((sum, record) => sum + record.assetSale!.amountUnpaid, 0);

        const expensePayable = recordList
          .filter((record) => record.type === RecordType.EXPENSE && record.expense?.partyId === party._id && record.expense?.currencyId === currency._id)
          .reduce((sum, record) => sum + record.expense!.amountUnpaid, 0);

        const purchasePayable = recordList
          .filter(
            (record) =>
              record.type === RecordType.ASSET_PURCHASE && record.assetPurchase?.partyId === party._id && record.assetPurchase?.currencyId === currency._id
          )
          .reduce((sum, record) => sum + record.assetPurchase!.amountUnpaid, 0);

        const totalPayablePayments = recordList
          .filter(
            (record) =>
              record.type === RecordType.PAYABLE_PAYMENT &&
              record.payablePayment?.partyId === partyId &&
              record.payablePayment?.currencyId === currency._id
          )
          .reduce((sum, record) => sum + record.payablePayment!.amount, 0);

        const totalReceivableReceipts = recordList
          .filter(
            (record) =>
              record.type === RecordType.RECEIVABLE_RECEIPT &&
              record.receivableReceipt?.partyId === partyId &&
              record.receivableReceipt?.currencyId === currency._id
          )
          .reduce((sum, record) => sum + record.receivableReceipt!.amount, 0);

        let totalOwedToParty =
          totalLoansTakenFromParty -
          totalLoansGivenToParty +
          totalRepaidByParty -
          totalRepaidToParty +
          totalLoanForgivenessReceived -
          totalLoanForgivenessGiven +
          (expensePayable + purchasePayable - totalPayablePayments) -
          (incomeReceivable + salesReceivable - totalReceivableReceipts);
        let totalOwedByParty = 0;
        if (totalOwedToParty < 0) {
          totalOwedByParty = totalOwedToParty * -1;
          totalOwedToParty = 0;
        }

        const summary: LoanAndDebtSummary = {
          partyId,
          partyName: party.name,
          incomeReceivable,
          salesReceivable,
          expensePayable,
          purchasePayable,
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

  async computeOverview(startEpoch: number, endEpoch: number, currencyId: string): Promise<Overview | null> {
    [startEpoch, endEpoch] = normalizeEpochRange(startEpoch, endEpoch);

    // ============== Preparation

    let res = await pouchdbService.listByCollection(Collection.CURRENCY);
    const currencyList = res.docs as Currency[];

    if (currencyList.length === 0) {
      return null;
    }

    res = await pouchdbService.listByCollection(Collection.RECORD);
    const fullRecordList = res.docs as Record[];

    res = await pouchdbService.listByCollection(Collection.PARTY);
    const partyList = res.docs as Party[];

    res = await pouchdbService.listByCollection(Collection.WALLET);
    const walletList = res.docs as Wallet[];

    res = await pouchdbService.listByCollection(Collection.ASSET);
    const assetList = res.docs as Asset[];

    res = await pouchdbService.listByCollection(Collection.INCOME_SOURCE);
    const incomeSourceList = res.docs as IncomeSource[];

    res = await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE);
    const expenseAvenueList = res.docs as ExpenseAvenue[];

    const recordList = fullRecordList
      .filter((record) => {
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
      })
      .filter((record) => record.transactionEpoch <= endEpoch);

    // ============== Cached Fetcher

    const getCurrency = (id: string) => currencyList.find((item) => item._id === id);

    const getIncomeSource = (id: string) => incomeSourceList.find((item) => item._id === id);

    const getExpenseAvenue = (id: string) => expenseAvenueList.find((item) => item._id === id);

    const getParty = (id: string) => partyList.find((item) => item._id === id);

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
      },
      assets: {
        list: [],
        sumByLiquidity: [],
        sumOfBalances: 0,
      },
      loanAndDebts: {
        list: [],
        userIsOwedTotalAmount: 0,
        userOwesTotalAmount: 0,
      },
      finalBalance: {
        totalAsset: 0,
        totalLiability: 0,
      },
      finalCurrentBalance: {
        totalAsset: 0,
        totalLiability: 0,
      },
      finalCurrentBalanceWithHighLiquidity: {
        totalAsset: 0,
        highLiquidiyAssetValue: 0,
        totalLiability: 0,
      },
    };

    // ============== Income

    {
      const finerRecordList = recordList
        .filter((record) => record.type === RecordType.INCOME && record.income)
        .filter((record) => record.transactionEpoch >= startEpoch && record.transactionEpoch <= endEpoch);
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

      overview.income.list.sort((a, b) => b.sum - a.sum);
    }

    // ============== Expense

    {
      const finerRecordList = recordList
        .filter((record) => record.type === RecordType.EXPENSE && record.expense)
        .filter((record) => record.transactionEpoch >= startEpoch && record.transactionEpoch <= endEpoch);
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

      overview.expense.list.sort((a, b) => b.sum - a.sum);
    }

    // ============== Wallet

    {
      const map: any = {};
      for (const wallet of walletList) {
        if (wallet.currencyId !== currencyId) continue;

        const key = `${wallet._id}`;
        map[key] = {
          walletId: wallet._id,
          wallet: wallet,
          balance: asAmount(wallet.initialBalance),
          minimumBalanceState: isNullOrUndefined(wallet.minimumBalance) ? "not-set" : "normal",
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

        // PAYABLE_PAYMENT (reduces wallet balance, unless write-off)
        map[key].balance += recordList
          .filter((record) => record.type === RecordType.PAYABLE_PAYMENT && record.payablePayment?.walletId === wallet._id && record.payablePayment?.walletId !== "write-off")
          .reduce((balance, record) => balance - asAmount(record.payablePayment?.amount), 0);

        // RECEIVABLE_RECEIPT (increases wallet balance, unless write-off)
        map[key].balance += recordList
          .filter((record) => record.type === RecordType.RECEIVABLE_RECEIPT && record.receivableReceipt?.walletId === wallet._id && record.receivableReceipt?.walletId !== "write-off")
          .reduce((balance, record) => balance + asAmount(record.receivableReceipt?.amount), 0);
      }

      Object.keys(map).forEach((key) => {
        const wallet = map[key];

        if (asAmount(wallet.wallet.minimumBalance) * 0.8 > asAmount(wallet.balance)) {
          wallet.minimumBalanceState = "warning";
        }

        if (asAmount(wallet.wallet.minimumBalance) > asAmount(wallet.balance)) {
          wallet.minimumBalanceState = "exceeded";
        }

        overview.wallets.list.push(wallet);
        overview.wallets.sumOfBalances += wallet.balance;
      });

      overview.wallets.list.sort((a, b) => b.balance - a.balance);
    }

    // ============== Asset

    {
      const map: any = {};
      for (const asset of assetList) {
        const key = `${asset._id}`;
        map[key] = {
          assetId: asset._id,
          asset: asset,
          balance: 0,
        };

        const initialBalance = asAmount(asset.initialBalance);

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

        map[key].balance = initialBalance + totalPurchases - totalSales + totalAppreciation;
      }

      Object.keys(map).forEach((key) => {
        overview.assets.list.push(map[key]);
        overview.assets.sumOfBalances += map[key].balance;
      });

      overview.assets.list.sort((a, b) => b.balance - a.balance);

      overview.assets.sumByLiquidity = assetLiquidityList.map((assetLiquidity) => {
        const sum = overview.assets.list.filter((asset) => asset.asset.liquidity === assetLiquidity.value).reduce((sum, asset) => asset.balance + sum, 0);
        return {
          liquidity: assetLiquidity.label,
          sum,
        };
      });
    }

    // ============== Loans and Debts

    {
      const summaryList = (await computationService.prepareLoanAndDebtSummary()).filter((summary) => summary.currencyId === currencyId);

      for (const summary of summaryList) {
        const { partyId } = summary;
        const theyOweUserAmount = summary.totalOwedByParty;
        const userOwesThemAmount = summary.totalOwedToParty;
        const party = getParty(partyId)!;
        overview.loanAndDebts.list.push({
          party,
          partyId,
          userOwesThemAmount,
          theyOweUserAmount,
        });
        overview.loanAndDebts.userIsOwedTotalAmount += theyOweUserAmount;
        overview.loanAndDebts.userOwesTotalAmount += userOwesThemAmount;
      }

      overview.loanAndDebts.list = overview.loanAndDebts.list.filter((item) => {
        return item.userOwesThemAmount > 0 || item.theyOweUserAmount > 0;
      });
    }

    // ============== Final Current Balance

    overview.finalCurrentBalance.totalAsset = overview.wallets.sumOfBalances + overview.loanAndDebts.userIsOwedTotalAmount;

    overview.finalBalance.totalLiability = overview.loanAndDebts.userOwesTotalAmount;

    // ============== Final Current Balance with High Liquidity

    overview.finalCurrentBalanceWithHighLiquidity.highLiquidiyAssetValue = overview.assets.sumByLiquidity.find((sum) => sum.liquidity === "High")!.sum;

    overview.finalCurrentBalanceWithHighLiquidity.totalAsset =
      overview.wallets.sumOfBalances + overview.finalCurrentBalanceWithHighLiquidity.highLiquidiyAssetValue + overview.loanAndDebts.userIsOwedTotalAmount;

    overview.finalCurrentBalanceWithHighLiquidity.totalLiability = overview.loanAndDebts.userOwesTotalAmount;

    // ============== Final Balance

    overview.finalBalance.totalAsset = overview.wallets.sumOfBalances + overview.assets.sumOfBalances + overview.loanAndDebts.userIsOwedTotalAmount;

    overview.finalBalance.totalLiability = overview.loanAndDebts.userOwesTotalAmount;

    return overview;
  }

  async computeUsedAmountForRollingBudgetInPlace(rollingBudget: RollingBudget) {
    const res = await pouchdbService.listByCollection(Collection.RECORD);
    const fullRecordList = res.docs as Record[];

    rollingBudget.budgetedPeriodList.sort((a, b) => a.startEpoch - b.startEpoch);

    let toRollOverAmount = 0;

    for (const budgetedPeriod of rollingBudget.budgetedPeriodList) {
      const startEpoch = normalizeEpochAsDate(budgetedPeriod.startEpoch);
      const endEpoch = normalizeEpochAsDateAtTheEndOfDay(budgetedPeriod.endEpoch);
      let narrowedRecordList = fullRecordList.filter((record) => record.transactionEpoch >= startEpoch && record.transactionEpoch <= endEpoch);

      if (rollingBudget.tagIdWhiteList.length > 0) {
        narrowedRecordList = narrowedRecordList.filter((record) => {
          return record.tagIdList.some((tagId) => rollingBudget.tagIdWhiteList.includes(tagId));
        });
      }

      if (rollingBudget.tagIdBlackList.length > 0) {
        narrowedRecordList = narrowedRecordList.filter((record) => {
          return !record.tagIdList.some((tagId) => rollingBudget.tagIdBlackList.includes(tagId));
        });
      }

      let usedAmount = 0;

      if (rollingBudget.includeExpenses) {
        const finerRecordList = narrowedRecordList.filter(
          (record) => record.type === RecordType.EXPENSE && record.expense && record.expense.currencyId === rollingBudget.currencyId
        );
        usedAmount += finerRecordList.reduce((sum, record) => sum + record.expense!.amount, 0);
      }

      if (rollingBudget.includeAssetPurchases) {
        const finerRecordList = narrowedRecordList.filter(
          (record) => record.type === RecordType.ASSET_PURCHASE && record.assetPurchase && record.assetPurchase.currencyId === rollingBudget.currencyId
        );
        usedAmount += finerRecordList.reduce((sum, record) => sum + record.assetPurchase!.amount, 0);
      }

      budgetedPeriod.allocatedAmount = asAmount(budgetedPeriod.allocatedAmount);
      budgetedPeriod.heldAmount = asAmount(budgetedPeriod.heldAmount);
      budgetedPeriod.usedAmount = usedAmount;
      budgetedPeriod.rolledOverAmount = toRollOverAmount;
      budgetedPeriod.totalAllocatedAmount = asAmount(budgetedPeriod.allocatedAmount) + asAmount(budgetedPeriod.rolledOverAmount);
      budgetedPeriod.remainingAmount = asAmount(budgetedPeriod.totalAllocatedAmount) - usedAmount - asAmount(budgetedPeriod.heldAmount);

      if (
        rollingBudget.rollOverRule === "always" ||
        (rollingBudget.rollOverRule === "positive-only" && budgetedPeriod.remainingAmount > 0) ||
        (rollingBudget.rollOverRule === "negative-only" && budgetedPeriod.remainingAmount < 0)
      ) {
        toRollOverAmount = budgetedPeriod.remainingAmount;
      }
    }
  }

  async computeQuickSummaryForCurrency(startEpoch: number, endEpoch: number, currency: Currency, fullRecordList: Record[] = []): Promise<QuickSummary> {
    [startEpoch, endEpoch] = normalizeEpochRange(startEpoch, endEpoch);
    const currencyId = currency._id!;

    const quickSummary: QuickSummary = {
      currency: currency,
      totalIncome: 0,
      totalExpense: 0,
      totalProfit: 0,
      totalInFlow: 0,
      totalOutFlow: 0,
      totalFlowBalance: 0,
    };

    const recordList = fullRecordList
      .filter((record) => {
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
      })
      .filter((record) => record.transactionEpoch <= endEpoch);

    // ============== Income
    {
      const finerRecordList = recordList
        .filter((record) => record.type === RecordType.INCOME && record.income)
        .filter((record) => record.transactionEpoch >= startEpoch && record.transactionEpoch <= endEpoch);
      quickSummary.totalIncome = finerRecordList.reduce((sum, record) => {
        return sum + asAmount(record.income!.amount);
      }, 0);
    }

    // ============== Expense
    {
      const finerRecordList = recordList
        .filter((record) => record.type === RecordType.EXPENSE && record.expense)
        .filter((record) => record.transactionEpoch >= startEpoch && record.transactionEpoch <= endEpoch);
      quickSummary.totalExpense = finerRecordList.reduce((sum, record) => {
        return sum + asAmount(record.expense!.amount);
      }, 0);
    }

    // ============== In-Flow and Out-Flow
    {
      const finerRecordList = recordList.filter((record) => record.transactionEpoch >= startEpoch && record.transactionEpoch <= endEpoch);
      for (const record of finerRecordList) {
        // in-flow
        if (record.type === RecordType.INCOME && record.income) {
          quickSummary.totalInFlow += asAmount(record.income.amountPaid);
        } else if (record.type === RecordType.ASSET_SALE && record.assetSale) {
          quickSummary.totalInFlow += asAmount(record.assetSale.amountPaid);
        } else if (record.type === RecordType.BORROWING && record.borrowing) {
          quickSummary.totalInFlow += asAmount(record.borrowing.amount);
        } else if (record.type === RecordType.REPAYMENT_RECEIVED && record.repaymentReceived) {
          quickSummary.totalInFlow += asAmount(record.repaymentReceived.amount);
        }
        // out-flow
        else if (record.type === RecordType.EXPENSE && record.expense) {
          quickSummary.totalOutFlow += asAmount(record.expense.amountPaid);
        } else if (record.type === RecordType.ASSET_PURCHASE && record.assetPurchase) {
          quickSummary.totalOutFlow += asAmount(record.assetPurchase.amountPaid);
        } else if (record.type === RecordType.LENDING && record.lending) {
          quickSummary.totalOutFlow += asAmount(record.lending.amount);
        } else if (record.type === RecordType.REPAYMENT_GIVEN && record.repaymentGiven) {
          quickSummary.totalOutFlow += asAmount(record.repaymentGiven.amount);
        }
        // complex/mixed
        else if (record.type === RecordType.MONEY_TRANSFER && record.moneyTransfer) {
          if (record.moneyTransfer.toCurrencyId === currencyId) {
            quickSummary.totalInFlow += asAmount(record.moneyTransfer.toAmount);
          }
          if (record.moneyTransfer.fromCurrencyId === currencyId) {
            quickSummary.totalOutFlow += asAmount(record.moneyTransfer.fromAmount);
          }
        } else if (record.type === RecordType.ASSET_APPRECIATION_DEPRECIATION && record.assetAppreciationDepreciation) {
          if (record.assetAppreciationDepreciation.type === "appreciation") {
            quickSummary.totalInFlow += asAmount(record.assetAppreciationDepreciation.amount);
          } else {
            quickSummary.totalOutFlow += asAmount(record.assetAppreciationDepreciation.amount);
          }
        }
      }
    }

    quickSummary.totalProfit = quickSummary.totalIncome - quickSummary.totalExpense;

    quickSummary.totalFlowBalance = quickSummary.totalInFlow - quickSummary.totalOutFlow;

    return quickSummary;
  }

  async computeQuickSummary(startEpoch: number, endEpoch: number, recordList: Record[]): Promise<QuickSummary[]> {
    const currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];

    return await Promise.all(
      currencyList.map(async (currency) => {
        return computationService.computeQuickSummaryForCurrency(startEpoch, endEpoch, currency, recordList);
      })
    );
  }

  async computeQuickExpenseSummary(recordList: Record[]): Promise<{ currency: Currency; sum: number; summary: QuickExpenseSummary[]; }[]> {
    const currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];

    const result: { currency: Currency; sum: number; summary: QuickExpenseSummary[]; }[] = [];

    for (const currency of currencyList) {
      const summary: QuickExpenseSummary[] = [];

      // sum expenses by expense avenue
      const expenseRecordList = recordList.filter((record) => record.expense && record.expense.currencyId === currency._id);
      const expenseMap: globalThis.Record<string, number> = {};
      for (const record of expenseRecordList) {
        const expense = record.expense!;
        const amount = asAmount(expense.amountPaid);
        const expenseAvenueId = expense.expenseAvenueId;
        if (!expenseMap[expenseAvenueId]) {
          expenseMap[expenseAvenueId] = 0;
        }
        expenseMap[expenseAvenueId] += amount;
      }

      // sum asset purchases by asset
      const assetPurchaseRecordList = recordList.filter((record) => record.assetPurchase && record.assetPurchase.currencyId === currency._id);
      const assetPurchaseMap: globalThis.Record<string, number> = {};
      for (const record of assetPurchaseRecordList) {
        const assetPurchase = record.assetPurchase!;
        const amount = asAmount(assetPurchase.amountPaid);
        const assetId = assetPurchase.assetId;
        if (!assetPurchaseMap[assetId]) {
          assetPurchaseMap[assetId] = 0;
        }
        assetPurchaseMap[assetId] += amount;
      }

      // create summary for expenses
      for (const expenseAvenueId in expenseMap) {
        const amount = expenseMap[expenseAvenueId];
        const expenseAvenue = await entityService.getExpenseAvenue(expenseAvenueId);
        summary.push({
          currency,
          type: "Expense",
          description: expenseAvenue.name,
          amount,
          count: 1,
        });
      }

      // create summary for asset purchases
      for (const assetId in assetPurchaseMap) {
        const amount = assetPurchaseMap[assetId];
        const asset = await entityService.getAsset(assetId);
        summary.push({
          currency,
          type: "Purchase",
          description: asset.name,
          amount,
          count: 1,
        });
      }

      summary.sort((a, b) => b.amount - a.amount);
      const sum = summary.reduce((sum, item) => sum + item.amount, 0);

      if (sum === 0) {
        continue;
      }

      result.push({
        currency,
        summary,
        sum,
      });
    }

    return result;
  }

  /**
   * Get list of unpaid expenses and purchases (Payables)
   */
  async preparePayablesList(currencyId: string): Promise<PayableItem[]> {
    const res = await pouchdbService.listByCollection(Collection.RECORD);
    const recordList = res.docs as Record[];

    const res2 = await pouchdbService.listByCollection(Collection.PARTY);
    const partyList = res2.docs as Party[];

    const res3 = await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE);
    const expenseAvenueList = res3.docs as ExpenseAvenue[];

    const res4 = await pouchdbService.listByCollection(Collection.ASSET);
    const assetList = res4.docs as Asset[];

    const res5 = await pouchdbService.listByCollection(Collection.CURRENCY);
    const currencyList = res5.docs as Currency[];

    const currency = currencyList.find((c) => c._id === currencyId);
    const currencySign = currency?.sign || "";

    const payables: PayableItem[] = [];

    // Calculate total payments made per record
    const paymentsByRecordId: { [key: string]: number } = {};
    recordList
      .filter((r) => r.type === RecordType.PAYABLE_PAYMENT && r.payablePayment?.currencyId === currencyId)
      .forEach((r) => {
        const originalId = r.payablePayment!.originalRecordId;
        if (!paymentsByRecordId[originalId]) {
          paymentsByRecordId[originalId] = 0;
        }
        paymentsByRecordId[originalId] += r.payablePayment!.amount;
      });

    // Process unpaid expenses
    recordList
      .filter((r) => r.type === RecordType.EXPENSE && r.expense?.currencyId === currencyId)
      .forEach((record) => {
        const expense = record.expense!;
        const additionalPayments = paymentsByRecordId[record._id!] || 0;
        const totalPaid = expense.amountPaid + additionalPayments;
        const remainingUnpaid = expense.amount - totalPaid;

        if (remainingUnpaid > 0) {
          const party = partyList.find((p) => p._id === expense.partyId);
          const expenseAvenue = expenseAvenueList.find((e) => e._id === expense.expenseAvenueId);

          payables.push({
            recordId: record._id!,
            transactionEpoch: record.transactionEpoch,
            partyId: expense.partyId,
            partyName: party?.name || "Unknown",
            type: "expense",
            description: expenseAvenue?.name || "Unknown",
            originalAmount: expense.amount,
            amountPaid: totalPaid,
            amountUnpaid: remainingUnpaid,
            currencyId,
            currencySign,
          });
        }
      });

    // Process unpaid asset purchases
    recordList
      .filter((r) => r.type === RecordType.ASSET_PURCHASE && r.assetPurchase?.currencyId === currencyId)
      .forEach((record) => {
        const purchase = record.assetPurchase!;
        const additionalPayments = paymentsByRecordId[record._id!] || 0;
        const totalPaid = purchase.amountPaid + additionalPayments;
        const remainingUnpaid = purchase.amount - totalPaid;

        if (remainingUnpaid > 0) {
          const party = partyList.find((p) => p._id === purchase.partyId);
          const asset = assetList.find((a) => a._id === purchase.assetId);

          payables.push({
            recordId: record._id!,
            transactionEpoch: record.transactionEpoch,
            partyId: purchase.partyId,
            partyName: party?.name || "Unknown",
            type: "asset-purchase",
            description: asset?.name || "Unknown",
            originalAmount: purchase.amount,
            amountPaid: totalPaid,
            amountUnpaid: remainingUnpaid,
            currencyId,
            currencySign,
          });
        }
      });

    return payables;
  }

  /**
   * Get list of unpaid income and sales (Receivables)
   */
  async prepareReceivablesList(currencyId: string): Promise<ReceivableItem[]> {
    const res = await pouchdbService.listByCollection(Collection.RECORD);
    const recordList = res.docs as Record[];

    const res2 = await pouchdbService.listByCollection(Collection.PARTY);
    const partyList = res2.docs as Party[];

    const res3 = await pouchdbService.listByCollection(Collection.INCOME_SOURCE);
    const incomeSourceList = res3.docs as IncomeSource[];

    const res4 = await pouchdbService.listByCollection(Collection.ASSET);
    const assetList = res4.docs as Asset[];

    const res5 = await pouchdbService.listByCollection(Collection.CURRENCY);
    const currencyList = res5.docs as Currency[];

    const currency = currencyList.find((c) => c._id === currencyId);
    const currencySign = currency?.sign || "";

    const receivables: ReceivableItem[] = [];

    // Calculate total receipts per record
    const receiptsByRecordId: { [key: string]: number } = {};
    recordList
      .filter((r) => r.type === RecordType.RECEIVABLE_RECEIPT && r.receivableReceipt?.currencyId === currencyId)
      .forEach((r) => {
        const originalId = r.receivableReceipt!.originalRecordId;
        if (!receiptsByRecordId[originalId]) {
          receiptsByRecordId[originalId] = 0;
        }
        receiptsByRecordId[originalId] += r.receivableReceipt!.amount;
      });

    // Process unpaid income
    recordList
      .filter((r) => r.type === RecordType.INCOME && r.income?.currencyId === currencyId)
      .forEach((record) => {
        const income = record.income!;
        const additionalReceipts = receiptsByRecordId[record._id!] || 0;
        const totalReceived = income.amountPaid + additionalReceipts;
        const remainingUnpaid = income.amount - totalReceived;

        if (remainingUnpaid > 0) {
          const party = partyList.find((p) => p._id === income.partyId);
          const incomeSource = incomeSourceList.find((i) => i._id === income.incomeSourceId);

          receivables.push({
            recordId: record._id!,
            transactionEpoch: record.transactionEpoch,
            partyId: income.partyId,
            partyName: party?.name || "Unknown",
            type: "income",
            description: incomeSource?.name || "Unknown",
            originalAmount: income.amount,
            amountReceived: totalReceived,
            amountUnpaid: remainingUnpaid,
            currencyId,
            currencySign,
          });
        }
      });

    // Process unpaid asset sales
    recordList
      .filter((r) => r.type === RecordType.ASSET_SALE && r.assetSale?.currencyId === currencyId)
      .forEach((record) => {
        const sale = record.assetSale!;
        const additionalReceipts = receiptsByRecordId[record._id!] || 0;
        const totalReceived = sale.amountPaid + additionalReceipts;
        const remainingUnpaid = sale.amount - totalReceived;

        if (remainingUnpaid > 0) {
          const party = partyList.find((p) => p._id === sale.partyId);
          const asset = assetList.find((a) => a._id === sale.assetId);

          receivables.push({
            recordId: record._id!,
            transactionEpoch: record.transactionEpoch,
            partyId: sale.partyId,
            partyName: party?.name || "Unknown",
            type: "asset-sale",
            description: asset?.name || "Unknown",
            originalAmount: sale.amount,
            amountReceived: totalReceived,
            amountUnpaid: remainingUnpaid,
            currencyId,
            currencySign,
          });
        }
      });

    return receivables;
  }

  /**
   * Get list of outstanding loans given
   */
  async prepareLoanGivenList(currencyId: string): Promise<LoanGivenItem[]> {
    const res = await pouchdbService.listByCollection(Collection.RECORD);
    const recordList = res.docs as Record[];

    const res2 = await pouchdbService.listByCollection(Collection.PARTY);
    const partyList = res2.docs as Party[];

    const res3 = await pouchdbService.listByCollection(Collection.CURRENCY);
    const currencyList = res3.docs as Currency[];

    const currency = currencyList.find((c) => c._id === currencyId);
    const currencySign = currency?.sign || "";

    const loansGiven: LoanGivenItem[] = [];

    // Get all lending records
    const lendingRecords = recordList.filter((r) => r.type === RecordType.LENDING && r.lending?.currencyId === currencyId);

    for (const lendingRecord of lendingRecords) {
      const lending = lendingRecord.lending!;
      const partyId = lending.partyId;
      const party = partyList.find((p) => p._id === partyId);

      // Calculate repayments received for this specific loan
      const repaymentsReceived = recordList
        .filter(
          (r) =>
            r.type === RecordType.REPAYMENT_RECEIVED &&
            r.repaymentReceived?.partyId === partyId &&
            r.repaymentReceived?.currencyId === currencyId &&
            r.transactionEpoch >= lendingRecord.transactionEpoch
        )
        .reduce((sum, r) => sum + r.repaymentReceived!.amount, 0);

      // Calculate forgiveness for this loan
      const forgiven = recordList
        .filter(
          (r) =>
            r.type === RecordType.LOAN_FORGIVENESS_GIVEN &&
            r.loanForgivenessGiven?.originalLendingRecordId === lendingRecord._id &&
            r.loanForgivenessGiven?.currencyId === currencyId
        )
        .reduce((sum, r) => sum + r.loanForgivenessGiven!.amountForgiven, 0);

      const outstanding = lending.amount - repaymentsReceived - forgiven;

      if (outstanding > 0) {
        loansGiven.push({
          lendingRecordId: lendingRecord._id!,
          transactionEpoch: lendingRecord.transactionEpoch,
          partyId,
          partyName: party?.name || "Unknown",
          amountLent: lending.amount,
          amountRepaid: repaymentsReceived,
          amountForgiven: forgiven,
          amountOutstanding: outstanding,
          currencyId,
          currencySign,
        });
      }
    }

    return loansGiven;
  }

  /**
   * Get list of outstanding loans taken
   */
  async prepareLoanTakenList(currencyId: string): Promise<LoanTakenItem[]> {
    const res = await pouchdbService.listByCollection(Collection.RECORD);
    const recordList = res.docs as Record[];

    const res2 = await pouchdbService.listByCollection(Collection.PARTY);
    const partyList = res2.docs as Party[];

    const res3 = await pouchdbService.listByCollection(Collection.CURRENCY);
    const currencyList = res3.docs as Currency[];

    const currency = currencyList.find((c) => c._id === currencyId);
    const currencySign = currency?.sign || "";

    const loansTaken: LoanTakenItem[] = [];

    // Get all borrowing records
    const borrowingRecords = recordList.filter((r) => r.type === RecordType.BORROWING && r.borrowing?.currencyId === currencyId);

    for (const borrowingRecord of borrowingRecords) {
      const borrowing = borrowingRecord.borrowing!;
      const partyId = borrowing.partyId;
      const party = partyList.find((p) => p._id === partyId);

      // Calculate repayments made for this specific loan
      const repaymentsMade = recordList
        .filter(
          (r) =>
            r.type === RecordType.REPAYMENT_GIVEN &&
            r.repaymentGiven?.partyId === partyId &&
            r.repaymentGiven?.currencyId === currencyId &&
            r.transactionEpoch >= borrowingRecord.transactionEpoch
        )
        .reduce((sum, r) => sum + r.repaymentGiven!.amount, 0);

      // Calculate forgiveness for this loan
      const forgiven = recordList
        .filter(
          (r) =>
            r.type === RecordType.LOAN_FORGIVENESS_RECEIVED &&
            r.loanForgivenessReceived?.originalBorrowingRecordId === borrowingRecord._id &&
            r.loanForgivenessReceived?.currencyId === currencyId
        )
        .reduce((sum, r) => sum + r.loanForgivenessReceived!.amountForgiven, 0);

      const outstanding = borrowing.amount - repaymentsMade - forgiven;

      if (outstanding > 0) {
        loansTaken.push({
          borrowingRecordId: borrowingRecord._id!,
          transactionEpoch: borrowingRecord.transactionEpoch,
          partyId,
          partyName: party?.name || "Unknown",
          amountBorrowed: borrowing.amount,
          amountRepaid: repaymentsMade,
          amountForgiven: forgiven,
          amountOutstanding: outstanding,
          currencyId,
          currencySign,
        });
      }
    }

    return loansTaken;
  }
}

export const computationService = new ComputationService();
