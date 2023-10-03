import { Asset } from "../asset";
import { Currency } from "../currency";
import { ExpenseAvenue } from "../expense-avenue";
import { IncomeSource } from "../income-source";
import { Party } from "../party";
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
  assets: {
    list: {
      assetId: string;
      balance: number;
      asset: Asset;
    }[];
    sumOfBalances: number;
  };
  computedReceivables: {
    list: {
      partyId: string;
      incomeReceivable: number;
      salesReceivable: number;
      party: Party;
    }[];
    totalIncomeReceivables: number;
    totalSalesReceivables: number;
  };
  computedPayables: {
    list: {
      partyId: string;
      expensePayable: number;
      purchasePayable: number;
      party: Party;
    }[];
    totalExpensePayables: number;
    totalPurchasePayables: number;
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
};
