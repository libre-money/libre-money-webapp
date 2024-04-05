import { AccAccount } from "./acc-account";

export type AccDebitOrCredit = {
  account: AccAccount;
  amount: number;
};

export type AccJournalEntry = {
  serial: number;
  entryEpoch: number;
  creditList: AccDebitOrCredit[];
  debitList: AccDebitOrCredit[];
  sumCredits: number;
  sumDebits: number;
  notes: string;
};
