import { Collection } from "src/constants/constants";
import { AccAccount } from "src/models/accounting/acc-account";
import { AccJournalEntry } from "src/models/accounting/acc-journal-entry";
import { AccLedger } from "src/models/accounting/acc-ledger";
import { AccLedgerEntry } from "src/models/accounting/acc-ledger-entry";
import { Currency } from "src/schemas/currency";
import { asAmount } from "src/utils/de-facto-utils";
import { pouchdbService } from "./pouchdb-service";

class AccountingLedgerService {
  private async injectCurencyAndOtherMetaDataToLedgerEntries(ledger: AccLedger) {
    const currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
    const currencyMap: Record<string, Currency> = {};
    currencyList.forEach((currency) => {
      currencyMap[currency._id!] = currency;
    });

    for (const journalEntry of ledger.ledgerEntryList) {
      journalEntry._currencySign = currencyMap[journalEntry.currencyId].sign;
    }

    for (const balance of ledger.balanceList) {
      balance._currency = currencyMap[balance.currencyId];
    }
  }

  async generateLedgerFromJournal(journalEntryList: AccJournalEntry[], accountMap: Record<string, AccAccount>, accountCode: string) {
    const ledgerEntryList: AccLedgerEntry[] = [];

    const account = accountMap[accountCode];
    const isBalanceDebit = ["Asset", "Expense"].includes(account.type);

    const currencyIdVsBalanceMap: Record<string, number> = {};
    const currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
    currencyList.forEach((currency) => {
      currencyIdVsBalanceMap[currency._id!] = 0;
    });

    let serialSeed = 0;
    for (const journalEntry of journalEntryList) {
      const debitEntryList = journalEntry.debitList.filter((item) => item.account.code === accountCode);
      const creditEntryList = journalEntry.creditList.filter((item) => item.account.code === accountCode);
      if (debitEntryList.length === 0 && creditEntryList.length === 0) continue;

      for (const debitEntry of debitEntryList) {
        const creditAmount = 0;
        const debitAmount = debitEntry.amount;
        const currencyId = debitEntry.currencyId;

        if (isBalanceDebit) {
          currencyIdVsBalanceMap[debitEntry.currencyId] += debitAmount;
        } else {
          currencyIdVsBalanceMap[debitEntry.currencyId] -= debitAmount;
        }

        const ledgerEntry: AccLedgerEntry = {
          serial: serialSeed++,
          account,
          entryEpoch: journalEntry.entryEpoch,
          isBalanceDebit,
          currencyId,
          debitAmount: asAmount(debitAmount),
          creditAmount: asAmount(creditAmount),
          balance: asAmount(currencyIdVsBalanceMap[currencyId]),
          description: journalEntry.description,
          notes: journalEntry.notes,
          journalEntryRef: journalEntry,
        };

        ledgerEntryList.push(ledgerEntry);
      }

      for (const creditEntry of creditEntryList) {
        const debitAmount = 0;
        const creditAmount = creditEntry.amount;
        const currencyId = creditEntry.currencyId;

        if (!isBalanceDebit) {
          currencyIdVsBalanceMap[creditEntry.currencyId] += creditAmount;
        } else {
          currencyIdVsBalanceMap[creditEntry.currencyId] -= creditAmount;
        }

        const ledgerEntry: AccLedgerEntry = {
          serial: serialSeed++,
          account,
          entryEpoch: journalEntry.entryEpoch,
          isBalanceDebit,
          currencyId,
          debitAmount: asAmount(debitAmount),
          creditAmount: asAmount(creditAmount),
          balance: asAmount(currencyIdVsBalanceMap[currencyId]),
          description: journalEntry.description,
          notes: journalEntry.notes,
          journalEntryRef: journalEntry,
        };

        ledgerEntryList.push(ledgerEntry);
      }
    }

    const balanceList = Object.keys(currencyIdVsBalanceMap).map((currencyId) => {
      return { currencyId, balance: asAmount(currencyIdVsBalanceMap[currencyId]) };
    });

    const ledger: AccLedger = {
      ledgerEntryList,
      account,
      isBalanceDebit,
      balanceList,
    };

    await this.injectCurencyAndOtherMetaDataToLedgerEntries(ledger);

    return ledger;
  }
}

export const accountingLedgerService = new AccountingLedgerService();
