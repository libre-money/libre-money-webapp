import { Currency } from "../currency";
import { ExpenseAvenue } from "../expense-avenue";
import { IncomeSource } from "../income-source";
import { Wallet } from "../wallet";

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
    }[];
    sumOfBalances: number;
  };
};
