import { AccDefaultAccounts } from "src/constants/accounting-constants";
import { AccAccount } from "src/models/accounting/acc-account";
import { dataInferenceService } from "./data-inference-service";
import { pouchdbService } from "./pouchdb-service";
import { Collection, RecordType, walletTypeList } from "src/constants/constants";
import { Record as SourceRecord } from "src/models/record";
import { AccDebitOrCredit, AccJournalEntry } from "src/models/accounting/acc-journal-entry";
import { asAmount } from "src/utils/misc-utils";
import { Currency } from "src/models/currency";

class AccountingService {
  async initiateAccounting() {
    // Populate all accounting heads
    const accountMap: Record<string, AccAccount> = {};

    Object.keys(AccDefaultAccounts).forEach((code) => {
      const name = AccDefaultAccounts[code].name;
      const type = AccDefaultAccounts[code].type;
      accountMap[code] = {
        name,
        type,
        code,
      };
    });

    const accountList = Object.keys(accountMap).map((code) => accountMap[code]);

    // Populate Opening Balances
    const journalEntryList: AccJournalEntry[] = [];

    // Populate Journal from Records
    const rawRecordList = (await pouchdbService.listByCollection(Collection.RECORD)).docs as SourceRecord[];
    await dataInferenceService.updateCurrencyCache();
    const inferredRecordList = await Promise.all(rawRecordList.map((rawData) => dataInferenceService.inferRecord(rawData)));
    inferredRecordList.sort((a, b) => (a.transactionEpoch || 0) - (b.transactionEpoch || 0));

    let serialSeed = 0;
    for (const record of inferredRecordList) {
      const creditList: AccDebitOrCredit[] = [];
      const debitList: AccDebitOrCredit[] = [];

      let notes = "";
      let description = "";

      // ================ EXPENSE
      if (record.type === RecordType.EXPENSE && record.expense) {
        const { expense } = record;
        console.log(record);

        debitList.push({
          account: accountMap[AccDefaultAccounts.EXPENSE__COMBINED_EXPENSE.code],
          currencyId: expense.currencyId,
          amount: asAmount(expense.amount),
        });
        description += `Spent ${expense.amount} as "${expense.expenseAvenue.name}". `;

        if (expense.amountPaid > 0 && expense.wallet) {
          if (expense.wallet.type === "credit-card") {
            creditList.push({
              account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
              currencyId: expense.currencyId,
              amount: asAmount(expense.amountPaid),
            });
          } else if (expense.wallet.type === "cash") {
            creditList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
              currencyId: expense.currencyId,
              amount: asAmount(expense.amountPaid),
            });
          } else {
            creditList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
              currencyId: expense.currencyId,
              amount: asAmount(expense.amountPaid),
            });
          }
          if (expense.amount === expense.amountPaid) {
            description += `Fully paid from "${expense.wallet.name}" (${expense.wallet.type}). `;
          } else {
            creditList.push({
              account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
              currencyId: expense.currencyId,
              amount: asAmount(expense.amount) - asAmount(expense.amountPaid),
            });
            description += `Partially paid from "${expense.wallet.name}" (${expense.wallet.type}). `;
          }
        } else {
          creditList.push({
            account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
            currencyId: expense.currencyId,
            amount: asAmount(expense.amount),
          });
          description += "Unpaid. ";
        }
      }
      // ================ INCOME
      else if (record.type === RecordType.INCOME && record.income) {
        const { income } = record;
        console.log(record);

        creditList.push({
          account: accountMap[AccDefaultAccounts.INCOME__COMBINED_INCOME.code],
          currencyId: income.currencyId,
          amount: asAmount(income.amount),
        });
        description += `Earned ${income.amount} as "${income.incomeSource.name}". `;

        if (income.amountPaid > 0 && income.wallet) {
          if (income.wallet.type === "credit-card") {
            debitList.push({
              account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
              currencyId: income.currencyId,
              amount: asAmount(income.amountPaid),
            });
          } else if (income.wallet.type === "cash") {
            debitList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
              currencyId: income.currencyId,
              amount: asAmount(income.amountPaid),
            });
          } else {
            debitList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
              currencyId: income.currencyId,
              amount: asAmount(income.amountPaid),
            });
          }
          if (income.amount === income.amountPaid) {
            description += `Fully received payment in "${income.wallet.name}" (${income.wallet.type}). `;
          } else {
            creditList.push({
              account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
              currencyId: income.currencyId,
              amount: asAmount(income.amount) - asAmount(income.amountPaid),
            });
            description += `Partially received payment in "${income.wallet.name}" (${income.wallet.type}). `;
          }
        } else {
          debitList.push({
            account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
            currencyId: income.currencyId,
            amount: asAmount(income.amount),
          });
          description += "Unpaid. ";
        }
      }

      const sumCredits = creditList.reduce((sum, credit) => sum + credit.amount, 0);
      const sumDebits = debitList.reduce((sum, credit) => sum + credit.amount, 0);

      if (record.notes && record.notes.length > 0) {
        notes = `Notes: ${record.notes}. `;
      }

      const journalEntry: AccJournalEntry = {
        serial: serialSeed++,
        entryEpoch: record.transactionEpoch,
        creditList,
        debitList,
        sumCredits,
        sumDebits,
        description,
        notes,
      };
      journalEntryList.push(journalEntry);
    }

    // Populate currency sign and other accessories
    const currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
    const currencyMap: Record<string, Currency> = {};
    currencyList.forEach((currency) => {
      currencyMap[currency._id!] = currency;
    });

    for (const journalEntry of journalEntryList) {
      for (const creditOrDebit of [...journalEntry.creditList, ...journalEntry.debitList]) {
        if (creditOrDebit.currencyId) {
          creditOrDebit._currencySign = currencyMap[creditOrDebit.currencyId].sign;
        } else {
          console.log("Missing Currency", journalEntry);
        }
      }
    }

    // return as an object
    return {
      accountMap,
      accountList,
      journalEntryList,
    };
  }
}

export const accountingService = new AccountingService();
