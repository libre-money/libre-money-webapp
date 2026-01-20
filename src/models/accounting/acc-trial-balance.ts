import { Currency } from "src/schemas/currency";
import { AccAccount } from "./acc-account";

export type AccTrialBalanceOfType = {
  isBalanceDebit: boolean;
  balanceList: {
    account: AccAccount;
    balance: number;
    isBalanceDebit: boolean;
  }[];
  totalBalance: number;
};

export type AccTrialBalanceWithCurrency = {
  trialBalanceOfTypeMap: Record<string, AccTrialBalanceOfType>;
  currencyId: string;
  _currency?: Currency;
};

export type AccTrialBalance = {
  trialBalanceWithCurrencyList: AccTrialBalanceWithCurrency[];
};
