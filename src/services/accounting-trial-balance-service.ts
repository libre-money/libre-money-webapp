import { AccDefaultAccounts, AccTypeList } from "src/constants/accounting-constants";
import { Collection } from "src/constants/constants";
import { AccAccount } from "src/models/accounting/acc-account";
import { AccJournalEntry } from "src/models/accounting/acc-journal-entry";
import { AccTrialBalance, AccTrialBalanceWithCurrency } from "src/models/accounting/acc-trial-balance";
import { Currency } from "src/models/currency";
import { asAmount } from "src/utils/de-facto-utils";
import { dialogService } from "./dialog-service";
import { pouchdbService } from "./pouchdb-service";

type TrialBalanceInterimContainer = {
  accountVsDebitBalanceMap: Record<string, number>;
};

class AccountingTrialBalanceService {
  private async closeTrialBalanceWithCurrency(trialBalanceWithCurrency: AccTrialBalanceWithCurrency, accountMap: Record<string, AccAccount>) {
    const retainedEarnings = asAmount(
      trialBalanceWithCurrency.trialBalanceOfTypeMap["Income"].totalBalance - trialBalanceWithCurrency.trialBalanceOfTypeMap["Expense"].totalBalance
    );

    const gapInPermanentBalance = asAmount(
      trialBalanceWithCurrency.trialBalanceOfTypeMap["Asset"].totalBalance -
        (trialBalanceWithCurrency.trialBalanceOfTypeMap["Liability"].totalBalance + trialBalanceWithCurrency.trialBalanceOfTypeMap["Equity"].totalBalance)
    );

    if (retainedEarnings !== gapInPermanentBalance) {
      const message = "The Trial Balance has been generated. However, a mismatch was found regarding Retained Earnings.";
      await dialogService.alert("Error", message);
      return;
    }

    const equity = trialBalanceWithCurrency.trialBalanceOfTypeMap["Equity"];
    equity.balanceList.push({
      account: accountMap[AccDefaultAccounts.EQUITY__RETAINED_EARNINGS.code],
      balance: retainedEarnings,
      isBalanceDebit: false,
    });
    equity.totalBalance += retainedEarnings;
  }

  private async prepareTrialBalanceWithCurrency(
    currency: Currency,
    currencyVsInterimMap: Record<string, TrialBalanceInterimContainer>,
    accountMap: Record<string, AccAccount>
  ) {
    const currencyId = currency._id!;
    const trialBalanceWithCurrency: AccTrialBalanceWithCurrency = {
      currencyId,
      _currency: currency,
      trialBalanceOfTypeMap: {},
    };
    AccTypeList.forEach((type) => {
      trialBalanceWithCurrency.trialBalanceOfTypeMap[type] = {
        isBalanceDebit: true,
        balanceList: [],
        totalBalance: 0,
      };
    });

    const map = currencyVsInterimMap[currencyId].accountVsDebitBalanceMap;
    for (const accountCode of Object.keys(map)) {
      const account = accountMap[accountCode];
      const debitBalance = map[accountCode];

      if (account.type === "Asset") {
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Asset"].isBalanceDebit = true;
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Asset"].totalBalance += asAmount(debitBalance);
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Asset"].balanceList.push({
          account,
          balance: asAmount(debitBalance),
          isBalanceDebit: true,
        });
      } else if (account.type === "Expense") {
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Expense"].isBalanceDebit = true;
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Expense"].totalBalance += asAmount(debitBalance);
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Expense"].balanceList.push({
          account,
          balance: asAmount(debitBalance),
          isBalanceDebit: true,
        });
      } else if (account.type === "Income") {
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Income"].isBalanceDebit = false;
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Income"].totalBalance -= asAmount(debitBalance);
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Income"].balanceList.push({
          account,
          balance: asAmount(debitBalance) * -1,
          isBalanceDebit: false,
        });
      } else if (account.type === "Liability") {
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Liability"].isBalanceDebit = false;
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Liability"].totalBalance -= asAmount(debitBalance);
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Liability"].balanceList.push({
          account,
          balance: asAmount(debitBalance) * -1,
          isBalanceDebit: false,
        });
      } else if (account.type === "Equity") {
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Equity"].isBalanceDebit = false;
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Equity"].totalBalance -= asAmount(debitBalance);
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Equity"].balanceList.push({
          account,
          balance: asAmount(debitBalance) * -1,
          isBalanceDebit: false,
        });
      }
    }

    await this.closeTrialBalanceWithCurrency(trialBalanceWithCurrency, accountMap);

    Object.keys(trialBalanceWithCurrency.trialBalanceOfTypeMap).forEach((key) => {
      const tbType = trialBalanceWithCurrency.trialBalanceOfTypeMap[key];
      tbType.totalBalance = asAmount(tbType.totalBalance);
    });

    return trialBalanceWithCurrency;
  }

  async generateTrialBalanceFromJournal(journalEntryList: AccJournalEntry[], accountMap: Record<string, AccAccount>) {
    const currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
    const currencyMap: Record<string, Currency> = {};

    const currencyVsInterimMap: Record<string, TrialBalanceInterimContainer> = {};
    currencyList.forEach((currency) => {
      currencyMap[currency._id!] = currency;
      const interim: TrialBalanceInterimContainer = {
        accountVsDebitBalanceMap: {},
      };
      currencyVsInterimMap[currency._id!] = interim;
    });

    for (const journalEntry of journalEntryList) {
      for (const debit of journalEntry.debitList) {
        const map = currencyVsInterimMap[debit.currencyId].accountVsDebitBalanceMap;
        if (!(debit.account.code in map)) {
          map[debit.account.code] = 0;
        }
        map[debit.account.code] += debit.amount;
      }

      for (const credit of journalEntry.creditList) {
        const map = currencyVsInterimMap[credit.currencyId].accountVsDebitBalanceMap;
        if (!(credit.account.code in map)) {
          map[credit.account.code] = 0;
        }
        map[credit.account.code] -= credit.amount;
      }
    }

    const trialBalance: AccTrialBalance = {
      trialBalanceWithCurrencyList: [],
    };

    for (const currency of currencyList) {
      const trialBalanceWithCurrency = await this.prepareTrialBalanceWithCurrency(currency, currencyVsInterimMap, accountMap);
      trialBalance.trialBalanceWithCurrencyList.push(trialBalanceWithCurrency);
    }

    return trialBalance;
  }
}

export const accountingTrialBalanceService = new AccountingTrialBalanceService();
