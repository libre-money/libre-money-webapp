import { Asset } from "src/schemas/asset";
import { Currency } from "src/schemas/currency";
import { ExpenseAvenue } from "src/schemas/expense-avenue";
import { IncomeSource } from "src/schemas/income-source";
import { Party } from "src/schemas/party";
import { Wallet } from "src/schemas/wallet";

export type Overview = {
  startEpoch: number;
  endEpoch: number;
  currency: Currency;

  income: {
    list: {
      incomeSourceId: string;
      sum: number;
      transactionCount: number;
      incomeSource: IncomeSource;
    }[];
    grandSum: number;
    totalTransactionCount: number;
  };
  expense: {
    list: {
      expenseAvenueId: string;
      sum: number;
      transactionCount: number;
      expenseAvenue: ExpenseAvenue;
    }[];
    grandSum: number;
    totalTransactionCount: number;
  };
  wallets: {
    list: {
      walletId: string;
      balance: number;
      wallet: Wallet;
      minimumBalanceState: string;
    }[];
    sumOfBalances: number;
  };
  assets: {
    list: {
      assetId: string;
      balance: number;
      asset: Asset;
    }[];
    sumByLiquidity: {
      liquidity: string;
      sum: number;
    }[];
    sumOfBalances: number;
  };
  loanAndDebts: {
    list: {
      partyId: string;
      theyOweUserAmount: number;
      userOwesThemAmount: number;
      party: Party;
    }[];
    userIsOwedTotalAmount: number;
    userOwesTotalAmount: number;
  };
  finalCurrentBalance: {
    totalAsset: number;
    totalLiability: number;
  };
  finalCurrentBalanceWithHighLiquidity: {
    totalAsset: number;
    highLiquidiyAssetValue: number;
    totalLiability: number;
  };
  finalBalance: {
    totalAsset: number;
    totalLiability: number;
  };
};
