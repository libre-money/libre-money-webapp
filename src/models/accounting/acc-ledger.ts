import { Currency } from "src/schemas/currency";
import { AccAccount } from "./acc-account";
import { AccJournalEntry } from "./acc-journal-entry";
import { AccLedgerEntry } from "./acc-ledger-entry";

export type AccLedger = {
  account: AccAccount;
  isBalanceDebit: boolean;
  ledgerEntryList: AccLedgerEntry[];
  balanceList: {
    currencyId: string;
    balance: number;
    _currency?: Currency;
  }[];
};
