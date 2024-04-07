import { AccAccount } from "./acc-account";

export type AccDebitOrCredit = {
  account: AccAccount;
  amount: number;
  currencyId: string;
  _currencySign?: string;
};

export type AccJournalEntry = {
  serial: number;
  entryEpoch: number;
  creditList: AccDebitOrCredit[];
  debitList: AccDebitOrCredit[];
  description: string;
  notes: string;
  isMultiCurrency: boolean;
  isBalanced: boolean;
  currencyIdList: string[];
};
