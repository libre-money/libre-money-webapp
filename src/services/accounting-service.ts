import { AccDefaultAccounts, AccTypeList } from "src/constants/accounting-constants";
import { Collection, RecordType } from "src/constants/constants";
import { AccAccount } from "src/models/accounting/acc-account";
import { AccDebitOrCredit, AccJournalEntry } from "src/models/accounting/acc-journal-entry";
import { Asset } from "src/models/asset";
import { Currency } from "src/models/currency";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { Record as SourceRecord } from "src/models/record";
import { Wallet } from "src/models/wallet";
import { asFinancialAmount } from "src/utils/misc-utils";
import { dataInferenceService } from "./data-inference-service";
import { pouchdbService } from "./pouchdb-service";
import { AccJournalFilters } from "src/models/accounting/acc-journal-filters";
import { AccLedgerEntry } from "src/models/accounting/acc-ledger-entry";
import { AccLedger } from "src/models/accounting/acc-ledger";
import { AccTrialBalance, AccTrialBalanceWithCurrency } from "src/models/accounting/acc-trial-balance";
import { dialogService } from "./dialog-service";
import { PROMISE_POOL_CONCURRENCY_LIMT } from "src/constants/config-constants";
import PromisePool from "src/utils/promise-pool";

type TrialBalanceInterimContainer = {
  accountVsDebitBalanceMap: Record<string, number>;
};

export type AccAccountingReturnable = {
  accountMap: Record<string, AccAccount>;
  accountList: AccAccount[];
  journalEntryList: AccJournalEntry[];
};

let accountingReturnCache: AccAccountingReturnable | null = null;

pouchdbService.registerUpsertListener(() => {
  accountingReturnCache = null;
});

class AccountingService {
  private flattenCreditOrDebitListOfTheSameCurrency(creditOrDebitList: AccDebitOrCredit[]) {
    if (creditOrDebitList.length === 0) {
      return creditOrDebitList;
    }

    const accountVsBalanceMap: Map<AccAccount, number> = new Map();
    for (const creditOrDebit of creditOrDebitList) {
      if (!accountVsBalanceMap.has(creditOrDebit.account)) {
        accountVsBalanceMap.set(creditOrDebit.account, 0);
      }
      accountVsBalanceMap.set(creditOrDebit.account, accountVsBalanceMap.get(creditOrDebit.account)! + creditOrDebit.amount);
    }

    const flattened: AccDebitOrCredit[] = [];
    accountVsBalanceMap.forEach((balance, account) => {
      flattened.push({
        account,
        amount: balance,
        currencyId: creditOrDebitList[0].currencyId,
      });
    });
    return flattened.filter((creditOrDebit) => creditOrDebit.amount > 0).sort((a, b) => a.amount - b.amount);
  }

  private async populateAccountMapAndList() {
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
    return { accountMap, accountList };
  }

  private async prepareInferredRecordList(progressNotifierFn: (a0: number) => void) {
    const rawRecordList = (await pouchdbService.listByCollection(Collection.RECORD)).docs as SourceRecord[];
    await dataInferenceService.updateCurrencyCache();

    let completedCount = 0;
    const inferredRecordList = await PromisePool.mapList(rawRecordList, PROMISE_POOL_CONCURRENCY_LIMT, async (rawData: SourceRecord) => {
      const result = await dataInferenceService.inferRecord(rawData);
      completedCount += 1;
      if (completedCount % Math.floor(rawRecordList.length / 10) === 0) {
        progressNotifierFn(completedCount / rawRecordList.length);
      }
      return result;
    });
    progressNotifierFn(1);

    // const inferredRecordList = await Promise.all(rawRecordList.map((rawData) => dataInferenceService.inferRecord(rawData)));
    inferredRecordList.sort((a, b) => (a.transactionEpoch || 0) - (b.transactionEpoch || 0));
    return inferredRecordList;
  }

  private async createOpeningBalanceEntriesForTheBeginningOfTime(accountMap: Record<string, AccAccount>) {
    const currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
    const assetList = (await pouchdbService.listByCollection(Collection.ASSET)).docs as Asset[];
    const walletList = (await pouchdbService.listByCollection(Collection.WALLET)).docs as Wallet[];

    const liquidityLookup: Record<string, string> = {
      high: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__HIGH_LIQUIDITY.code,
      moderate: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__MEDIUM_LIQUIDITY.code,
      low: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__LOW_LIQUIDITY.code,
      unsure: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__UNKNOWN_LIQUIDITY.code,
    };

    let serialSeed = 0;

    const journalEntryList: AccJournalEntry[] = [];
    for (const currency of currencyList) {
      let creditList: AccDebitOrCredit[] = [];
      let debitList: AccDebitOrCredit[] = [];

      // assets
      let assetEquity = 0;
      for (const asset of assetList) {
        if (asset.currencyId !== currency._id) continue;

        debitList.push({
          account: accountMap[liquidityLookup[asset.liquidity]],
          currencyId: asset.currencyId,
          amount: asFinancialAmount(asset.initialBalance),
        });

        assetEquity += asFinancialAmount(asset.initialBalance);
      }
      creditList.push({
        account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
        currencyId: currency._id!,
        amount: asFinancialAmount(assetEquity),
      });

      // wallets
      for (const wallet of walletList) {
        if (wallet.currencyId !== currency._id) continue;

        if (wallet.type === "credit-card") {
          if (wallet.initialBalance < 0) {
            // Credit Card had negative balance, meaning it was a liability
            creditList.push({
              account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
              currencyId: wallet.currencyId,
              amount: asFinancialAmount(wallet.initialBalance) * -1,
            });
            debitList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asFinancialAmount(wallet.initialBalance) * -1,
            });
          } else {
            // Credit Card had advance payment. We have to treat it like an asset OR a contra-liability
            debitList.push({
              account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
              currencyId: wallet.currencyId,
              amount: asFinancialAmount(wallet.initialBalance),
            });
            creditList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asFinancialAmount(wallet.initialBalance),
            });
          }
        } else if (wallet.type === "cash") {
          // Account for initial negative balance
          if (wallet.initialBalance < 0) {
            creditList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
              currencyId: wallet.currencyId,
              amount: asFinancialAmount(wallet.initialBalance) * -1,
            });
            debitList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asFinancialAmount(wallet.initialBalance) * -1,
            });
          } else {
            debitList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
              currencyId: wallet.currencyId,
              amount: asFinancialAmount(wallet.initialBalance),
            });
            creditList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asFinancialAmount(wallet.initialBalance),
            });
          }
        } else {
          // Account for initial negative balance
          if (wallet.initialBalance < 0) {
            creditList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
              currencyId: wallet.currencyId,
              amount: asFinancialAmount(wallet.initialBalance) * -1,
            });
            debitList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asFinancialAmount(wallet.initialBalance) * -1,
            });
          } else {
            debitList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
              currencyId: wallet.currencyId,
              amount: asFinancialAmount(wallet.initialBalance),
            });
            creditList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asFinancialAmount(wallet.initialBalance),
            });
          }
        }
      }

      creditList = this.flattenCreditOrDebitListOfTheSameCurrency(creditList);
      debitList = this.flattenCreditOrDebitListOfTheSameCurrency(debitList);

      const { currencyIdList, isMultiCurrency, isBalanced } = await this.checkJournalEntryBalance(debitList, creditList);

      const description = "Calculated Opening Balances from Assets and Liabilities";

      const journalEntry: AccJournalEntry = {
        modality: "opening",
        serial: serialSeed++,
        entryEpoch: 0,
        creditList,
        debitList,
        description,
        notes: "",
        isMultiCurrency,
        isBalanced,
        currencyIdList,
      };
      journalEntryList.push(journalEntry);
    }

    return journalEntryList;
  }

  private async convertExpense(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { expense } = record;
    if (!expense) throw new Error("Malformatted Data");

    debitList.push({
      account: accountMap[AccDefaultAccounts.EXPENSE__COMBINED_EXPENSE.code],
      currencyId: expense.currencyId,
      amount: asFinancialAmount(expense.amount),
    });
    description += `Spent ${dataInferenceService.getPrintableAmount(expense.amount, expense.currencyId)} as "${expense.expenseAvenue.name}". `;

    if (expense.amountPaid > 0) {
      if (expense.wallet.type === "credit-card") {
        creditList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
          currencyId: expense.currencyId,
          amount: asFinancialAmount(expense.amountPaid),
        });
      } else if (expense.wallet.type === "cash") {
        creditList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
          currencyId: expense.currencyId,
          amount: asFinancialAmount(expense.amountPaid),
        });
      } else {
        creditList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
          currencyId: expense.currencyId,
          amount: asFinancialAmount(expense.amountPaid),
        });
      }
      if (expense.amount === expense.amountPaid) {
        description += `Fully paid from "${expense.wallet.name}" (${expense.wallet.type}). `;
      } else {
        creditList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
          currencyId: expense.currencyId,
          amount: asFinancialAmount(expense.amount) - asFinancialAmount(expense.amountPaid),
        });
        description += `Partially paid from "${expense.wallet.name}" (${expense.wallet.type}). `;
      }
    } else {
      creditList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
        currencyId: expense.currencyId,
        amount: asFinancialAmount(expense.amount),
      });
      description += "Unpaid. ";
    }

    return { creditList, debitList, description };
  }

  private async convertIncome(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { income } = record;
    if (!income) throw new Error("Malformatted Data");

    creditList.push({
      account: accountMap[AccDefaultAccounts.INCOME__COMBINED_INCOME.code],
      currencyId: income.currencyId,
      amount: asFinancialAmount(income.amount),
    });
    description += `Earned ${dataInferenceService.getPrintableAmount(income.amount, income.currencyId)} as "${income.incomeSource.name}". `;

    if (income.amountPaid > 0) {
      if (income.wallet.type === "credit-card") {
        debitList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
          currencyId: income.currencyId,
          amount: asFinancialAmount(income.amountPaid),
        });
      } else if (income.wallet.type === "cash") {
        debitList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
          currencyId: income.currencyId,
          amount: asFinancialAmount(income.amountPaid),
        });
      } else {
        debitList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
          currencyId: income.currencyId,
          amount: asFinancialAmount(income.amountPaid),
        });
      }
      if (income.amount === income.amountPaid) {
        description += `Fully received payment in "${income.wallet.name}" (${income.wallet.type}). `;
      } else {
        creditList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
          currencyId: income.currencyId,
          amount: asFinancialAmount(income.amount) - asFinancialAmount(income.amountPaid),
        });
        description += `Partially received payment in "${income.wallet.name}" (${income.wallet.type}). `;
      }
    } else {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
        currencyId: income.currencyId,
        amount: asFinancialAmount(income.amount),
      });
      description += "Unpaid. ";
    }

    return { creditList, debitList, description };
  }

  private async convertMoneyTransfer(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { moneyTransfer } = record;
    if (!moneyTransfer) throw new Error("Malformatted Data");

    // Source
    if (moneyTransfer.fromWallet.type === "credit-card") {
      creditList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
        currencyId: moneyTransfer.fromCurrencyId,
        amount: asFinancialAmount(moneyTransfer.fromAmount),
      });
    } else if (moneyTransfer.fromWallet.type === "cash") {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: moneyTransfer.fromCurrencyId,
        amount: asFinancialAmount(moneyTransfer.fromAmount),
      });
    } else {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: moneyTransfer.fromCurrencyId,
        amount: asFinancialAmount(moneyTransfer.fromAmount),
      });
    }

    // Target
    if (moneyTransfer.toWallet.type === "credit-card") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
        currencyId: moneyTransfer.toCurrencyId,
        amount: asFinancialAmount(moneyTransfer.toAmount),
      });
    } else if (moneyTransfer.toWallet.type === "cash") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: moneyTransfer.toCurrencyId,
        amount: asFinancialAmount(moneyTransfer.toAmount),
      });
    } else {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: moneyTransfer.toCurrencyId,
        amount: asFinancialAmount(moneyTransfer.toAmount),
      });
    }

    if (moneyTransfer.fromAmount === moneyTransfer.toAmount && moneyTransfer.fromCurrencyId === moneyTransfer.toCurrencyId) {
      description += `Transfered ${dataInferenceService.getPrintableAmount(moneyTransfer.fromAmount, moneyTransfer.fromCurrencyId)} from 
      "${moneyTransfer.fromWallet.name}" to "${moneyTransfer.toWallet.name}". `;
    } else {
      description += `Transfered ${dataInferenceService.getPrintableAmount(moneyTransfer.fromAmount, moneyTransfer.fromCurrencyId)} from 
      "${moneyTransfer.fromWallet.name}" into ${dataInferenceService.getPrintableAmount(moneyTransfer.toAmount, moneyTransfer.toCurrencyId)}
       on "${moneyTransfer.toWallet.name}". `;
    }

    if (moneyTransfer.toCurrencyId === moneyTransfer.fromCurrencyId) {
      if (asFinancialAmount(moneyTransfer.fromAmount) > asFinancialAmount(moneyTransfer.toAmount)) {
        const diff = asFinancialAmount(moneyTransfer.fromAmount) - asFinancialAmount(moneyTransfer.toAmount);
        debitList.push({
          account: accountMap[AccDefaultAccounts.EXPENSE__MINOR_ADJUSTMENT.code],
          currencyId: moneyTransfer.toCurrencyId,
          amount: diff,
        });
        description += `Transfer fee: ${dataInferenceService.getPrintableAmount(diff, moneyTransfer.toCurrencyId)}. `;
      } else if (asFinancialAmount(moneyTransfer.fromAmount) < asFinancialAmount(moneyTransfer.toAmount)) {
        const diff = asFinancialAmount(moneyTransfer.toAmount) - asFinancialAmount(moneyTransfer.fromAmount);
        debitList.push({
          account: accountMap[AccDefaultAccounts.INCOME__MINOR_ADJUSTMENT.code],
          currencyId: moneyTransfer.toCurrencyId,
          amount: diff,
        });
        description += `Gained during transfer: ${dataInferenceService.getPrintableAmount(diff, moneyTransfer.toCurrencyId)}. `;
      }
    }

    // Equity offset to maintain separate accounts across multiple currencies. See Issue #20
    if (moneyTransfer.toCurrencyId !== moneyTransfer.fromCurrencyId) {
      debitList.push({
        account: accountMap[AccDefaultAccounts.EQUITY__INTERCURRENCY.code],
        currencyId: moneyTransfer.fromCurrencyId,
        amount: asFinancialAmount(moneyTransfer.fromAmount),
      });

      creditList.push({
        account: accountMap[AccDefaultAccounts.EQUITY__INTERCURRENCY.code],
        currencyId: moneyTransfer.toCurrencyId,
        amount: asFinancialAmount(moneyTransfer.toAmount),
      });
    }

    return { creditList, debitList, description };
  }

  private async convertAssetPurchase(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { assetPurchase } = record;
    if (!assetPurchase) throw new Error("Malformatted Data");

    const liquidityLookup: Record<string, string> = {
      high: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__HIGH_LIQUIDITY.code,
      moderate: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__MEDIUM_LIQUIDITY.code,
      low: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__LOW_LIQUIDITY.code,
      unsure: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__UNKNOWN_LIQUIDITY.code,
    };
    debitList.push({
      account: accountMap[liquidityLookup[assetPurchase.asset.liquidity]],
      currencyId: assetPurchase.currencyId,
      amount: asFinancialAmount(assetPurchase.amount),
    });
    description += `Purchased asset "${assetPurchase.asset.name}" for ${dataInferenceService.getPrintableAmount(
      assetPurchase.amount,
      assetPurchase.currencyId
    )}. `;

    if (assetPurchase.amountPaid > 0 && assetPurchase.wallet) {
      if (assetPurchase.wallet.type === "credit-card") {
        creditList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
          currencyId: assetPurchase.currencyId,
          amount: asFinancialAmount(assetPurchase.amountPaid),
        });
      } else if (assetPurchase.wallet.type === "cash") {
        creditList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
          currencyId: assetPurchase.currencyId,
          amount: asFinancialAmount(assetPurchase.amountPaid),
        });
      } else {
        creditList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
          currencyId: assetPurchase.currencyId,
          amount: asFinancialAmount(assetPurchase.amountPaid),
        });
      }
      if (assetPurchase.amount === assetPurchase.amountPaid) {
        description += `Fully paid from "${assetPurchase.wallet.name}" (${assetPurchase.wallet.type}). `;
      } else {
        creditList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
          currencyId: assetPurchase.currencyId,
          amount: asFinancialAmount(assetPurchase.amount) - asFinancialAmount(assetPurchase.amountPaid),
        });
        description += `Partially paid from "${assetPurchase.wallet.name}" (${assetPurchase.wallet.type}). `;
      }
    } else {
      creditList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
        currencyId: assetPurchase.currencyId,
        amount: asFinancialAmount(assetPurchase.amount),
      });
      description += "Unpaid. ";
    }

    return { creditList, debitList, description };
  }

  private async convertAssetSale(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { assetSale } = record;
    if (!assetSale) throw new Error("Malformatted Data");

    const liquidityLookup: Record<string, string> = {
      high: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__HIGH_LIQUIDITY.code,
      moderate: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__MEDIUM_LIQUIDITY.code,
      low: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__LOW_LIQUIDITY.code,
      unsure: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__UNKNOWN_LIQUIDITY.code,
    };

    creditList.push({
      account: accountMap[liquidityLookup[assetSale.asset.liquidity]],
      currencyId: assetSale.currencyId,
      amount: asFinancialAmount(assetSale.amount),
    });
    description += `Sold asset "${assetSale.asset.name}" for ${dataInferenceService.getPrintableAmount(assetSale.amount, assetSale.currencyId)}. `;

    if (assetSale.amountPaid > 0) {
      if (assetSale.wallet.type === "credit-card") {
        debitList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
          currencyId: assetSale.currencyId,
          amount: asFinancialAmount(assetSale.amountPaid),
        });
      } else if (assetSale.wallet.type === "cash") {
        debitList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
          currencyId: assetSale.currencyId,
          amount: asFinancialAmount(assetSale.amountPaid),
        });
      } else {
        debitList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
          currencyId: assetSale.currencyId,
          amount: asFinancialAmount(assetSale.amountPaid),
        });
      }
      if (assetSale.amount === assetSale.amountPaid) {
        description += `Fully received payment in "${assetSale.wallet.name}" (${assetSale.wallet.type}). `;
      } else {
        creditList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
          currencyId: assetSale.currencyId,
          amount: asFinancialAmount(assetSale.amount) - asFinancialAmount(assetSale.amountPaid),
        });
        description += `Partially received payment in "${assetSale.wallet.name}" (${assetSale.wallet.type}). `;
      }
    } else {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
        currencyId: assetSale.currencyId,
        amount: asFinancialAmount(assetSale.amount),
      });
      description += "Unpaid. ";
    }

    return { creditList, debitList, description };
  }

  private async convertAssetAppreciationDepreciation(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { assetAppreciationDepreciation } = record;
    if (!assetAppreciationDepreciation) throw new Error("Malformatted Data");

    const liquidityLookup: Record<string, string> = {
      high: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__HIGH_LIQUIDITY.code,
      moderate: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__MEDIUM_LIQUIDITY.code,
      low: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__LOW_LIQUIDITY.code,
      unsure: AccDefaultAccounts.ASSET__NON_CURRENT_ASSET__UNKNOWN_LIQUIDITY.code,
    };

    if (assetAppreciationDepreciation.type === "appreciation") {
      debitList.push({
        account: accountMap[liquidityLookup[assetAppreciationDepreciation.asset.liquidity]],
        currencyId: assetAppreciationDepreciation.currencyId,
        amount: asFinancialAmount(assetAppreciationDepreciation.amount),
      });
      creditList.push({
        account: accountMap[AccDefaultAccounts.INCOME__ASSET_APPRECIATION.code],
        currencyId: assetAppreciationDepreciation.currencyId,
        amount: asFinancialAmount(assetAppreciationDepreciation.amount),
      });
      description += `Asset "${assetAppreciationDepreciation.asset.name}" appreciated by ${dataInferenceService.getPrintableAmount(
        assetAppreciationDepreciation.amount,
        assetAppreciationDepreciation.currencyId
      )}. `;
    } else {
      creditList.push({
        account: accountMap[liquidityLookup[assetAppreciationDepreciation.asset.liquidity]],
        currencyId: assetAppreciationDepreciation.currencyId,
        amount: asFinancialAmount(assetAppreciationDepreciation.amount),
      });
      debitList.push({
        account: accountMap[AccDefaultAccounts.EXPENSE__ASSET_DEPRECIATION.code],
        currencyId: assetAppreciationDepreciation.currencyId,
        amount: asFinancialAmount(assetAppreciationDepreciation.amount),
      });

      description += `Asset "${assetAppreciationDepreciation.asset.name}" depreciated by ${dataInferenceService.getPrintableAmount(
        assetAppreciationDepreciation.amount,
        assetAppreciationDepreciation.currencyId
      )}. `;
    }

    return { creditList, debitList, description };
  }

  private async convertLending(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { lending } = record;
    if (!lending) throw new Error("Malformatted Data");

    debitList.push({
      account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
      currencyId: lending.currencyId,
      amount: asFinancialAmount(lending.amount),
    });
    description += `Lent ${dataInferenceService.getPrintableAmount(lending.amount, lending.currencyId)} to "${lending.party.name}"
     from "${lending.wallet.name}". `;

    if (lending.wallet.type === "credit-card") {
      creditList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
        currencyId: lending.currencyId,
        amount: asFinancialAmount(lending.amount),
      });
    } else if (lending.wallet.type === "cash") {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: lending.currencyId,
        amount: asFinancialAmount(lending.amount),
      });
    } else {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: lending.currencyId,
        amount: asFinancialAmount(lending.amount),
      });
    }

    return { creditList, debitList, description };
  }

  private async convertBorrowing(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { borrowing } = record;
    if (!borrowing) throw new Error("Malformatted Data");

    creditList.push({
      account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
      currencyId: borrowing.currencyId,
      amount: asFinancialAmount(borrowing.amount),
    });
    description += `Borrowed ${dataInferenceService.getPrintableAmount(borrowing.amount, borrowing.currencyId)} from "${borrowing.party.name}"
     into "${borrowing.wallet.name}". `;

    if (borrowing.wallet.type === "credit-card") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
        currencyId: borrowing.currencyId,
        amount: asFinancialAmount(borrowing.amount),
      });
    } else if (borrowing.wallet.type === "cash") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: borrowing.currencyId,
        amount: asFinancialAmount(borrowing.amount),
      });
    } else {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: borrowing.currencyId,
        amount: asFinancialAmount(borrowing.amount),
      });
    }

    return { creditList, debitList, description };
  }

  private async convertRepaymentReceived(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { repaymentReceived } = record;
    if (!repaymentReceived) throw new Error("Malformatted Data");

    creditList.push({
      account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
      currencyId: repaymentReceived.currencyId,
      amount: asFinancialAmount(repaymentReceived.amount),
    });
    description += `Repayment received of ${dataInferenceService.getPrintableAmount(repaymentReceived.amount, repaymentReceived.currencyId)}
          from "${repaymentReceived.party.name}"
          into "${repaymentReceived.wallet.name}". `;

    if (repaymentReceived.wallet.type === "credit-card") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
        currencyId: repaymentReceived.currencyId,
        amount: asFinancialAmount(repaymentReceived.amount),
      });
    } else if (repaymentReceived.wallet.type === "cash") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: repaymentReceived.currencyId,
        amount: asFinancialAmount(repaymentReceived.amount),
      });
    } else {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: repaymentReceived.currencyId,
        amount: asFinancialAmount(repaymentReceived.amount),
      });
    }

    return { creditList, debitList, description };
  }

  private async convertRepaymentGiven(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { repaymentGiven } = record;
    if (!repaymentGiven) throw new Error("Malformatted Data");

    debitList.push({
      account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
      currencyId: repaymentGiven.currencyId,
      amount: asFinancialAmount(repaymentGiven.amount),
    });
    description += `Repayment given of ${dataInferenceService.getPrintableAmount(repaymentGiven.amount, repaymentGiven.currencyId)} 
          to "${repaymentGiven.party.name}"
          from "${repaymentGiven.wallet.name}". `;

    if (repaymentGiven.wallet.type === "credit-card") {
      creditList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
        currencyId: repaymentGiven.currencyId,
        amount: asFinancialAmount(repaymentGiven.amount),
      });
    } else if (repaymentGiven.wallet.type === "cash") {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: repaymentGiven.currencyId,
        amount: asFinancialAmount(repaymentGiven.amount),
      });
    } else {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: repaymentGiven.currencyId,
        amount: asFinancialAmount(repaymentGiven.amount),
      });
    }

    return { creditList, debitList, description };
  }

  private async checkJournalEntryBalance(debitList: AccDebitOrCredit[], creditList: AccDebitOrCredit[]) {
    const balanceByCurrencyMap: Record<string, number> = {};

    debitList.forEach((debit) => {
      if (!(debit.currencyId in balanceByCurrencyMap)) {
        balanceByCurrencyMap[debit.currencyId] = 0;
      }
      balanceByCurrencyMap[debit.currencyId] += debit.amount;
    });
    creditList.forEach((credit) => {
      if (!(credit.currencyId in balanceByCurrencyMap)) {
        balanceByCurrencyMap[credit.currencyId] = 0;
      }
      balanceByCurrencyMap[credit.currencyId] -= credit.amount;
    });

    const currencyIdList = Object.keys(balanceByCurrencyMap);
    const isMultiCurrency = Object.keys(balanceByCurrencyMap).length > 1;
    const isBalanced = Object.keys(balanceByCurrencyMap).every(
      (currencyId) => balanceByCurrencyMap[currencyId] >= -0.001 && balanceByCurrencyMap[currencyId] <= 0.001
    );
    return { currencyIdList, isMultiCurrency, isBalanced };
  }

  private async covertInferredRecordToJournalEntry(record: InferredRecord, serial: number, accountMap: Record<string, AccAccount>) {
    let creditList: AccDebitOrCredit[] = [];
    let debitList: AccDebitOrCredit[] = [];
    let description = "";

    // ================ EXPENSE
    if (record.type === RecordType.EXPENSE && record.expense) {
      ({ creditList, debitList, description } = await this.convertExpense(record, accountMap));
    }
    // ================ INCOME
    else if (record.type === RecordType.INCOME && record.income) {
      ({ creditList, debitList, description } = await this.convertIncome(record, accountMap));
    }
    // ================ MONEY TRANSFER
    else if (record.type === RecordType.MONEY_TRANSFER && record.moneyTransfer) {
      ({ creditList, debitList, description } = await this.convertMoneyTransfer(record, accountMap));
    }
    // ================ ASSET_PURCHASE
    else if (record.type === RecordType.ASSET_PURCHASE && record.assetPurchase) {
      ({ creditList, debitList, description } = await this.convertAssetPurchase(record, accountMap));
    }
    // ================ ASSET_SALE
    else if (record.type === RecordType.ASSET_SALE && record.assetSale) {
      ({ creditList, debitList, description } = await this.convertAssetSale(record, accountMap));
    }
    // ================ ASSET_APPRECIATION_DEPRECIATION
    else if (record.type === RecordType.ASSET_APPRECIATION_DEPRECIATION && record.assetAppreciationDepreciation) {
      ({ creditList, debitList, description } = await this.convertAssetAppreciationDepreciation(record, accountMap));
    }
    // ================ LENDING
    else if (record.type === RecordType.LENDING && record.lending) {
      ({ creditList, debitList, description } = await this.convertLending(record, accountMap));
    }
    // ================ BORROWING
    else if (record.type === RecordType.BORROWING && record.borrowing) {
      ({ creditList, debitList, description } = await this.convertBorrowing(record, accountMap));
    }
    // ================ REPAYMENT_RECEIVED
    else if (record.type === RecordType.REPAYMENT_RECEIVED && record.repaymentReceived) {
      ({ creditList, debitList, description } = await this.convertRepaymentReceived(record, accountMap));
    }
    // ================ REPAYMENT_GIVEN
    else if (record.type === RecordType.REPAYMENT_GIVEN && record.repaymentGiven) {
      ({ creditList, debitList, description } = await this.convertRepaymentGiven(record, accountMap));
    }

    // Check balances
    const { currencyIdList, isMultiCurrency, isBalanced } = await this.checkJournalEntryBalance(debitList, creditList);

    // Notes
    let notes = "";
    if (record.notes && record.notes.length > 0) {
      notes = `Notes: ${record.notes}. `;
    }

    const journalEntry: AccJournalEntry = {
      modality: "standard",
      serial,
      entryEpoch: record.transactionEpoch,
      creditList,
      debitList,
      description,
      notes,
      isMultiCurrency,
      isBalanced,
      currencyIdList,
    };
    return journalEntry;
  }

  private async injectCurencyAndOtherMetaDataToJournalEntries(journalEntryList: AccJournalEntry[]) {
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
          console.debug("Missing Currency:", journalEntry);
          throw new Error("Missing Currency");
        }
      }
    }
  }

  private async adjustOpeningBalanceDate(journalEntryList: AccJournalEntry[]) {
    const firstStandard = journalEntryList.find((entry) => entry.modality === "standard");
    if (firstStandard) {
      journalEntryList
        .filter((entry) => entry.modality === "opening")
        .forEach((entry) => {
          entry.entryEpoch = firstStandard.entryEpoch;
        });
    }
  }

  async initiateAccounting(progressNotifierFn: (a0: number) => void): Promise<AccAccountingReturnable> {
    if (accountingReturnCache) {
      return accountingReturnCache;
    }

    // Populate all accounting heads
    const { accountMap, accountList } = await this.populateAccountMapAndList();

    // Journal Entry List
    const journalEntryList: AccJournalEntry[] = [];

    // Populate Opening Balances
    journalEntryList.push(...(await this.createOpeningBalanceEntriesForTheBeginningOfTime(accountMap)));

    // Populate Journal from Records
    const inferredRecordList = await this.prepareInferredRecordList(progressNotifierFn);
    let serialSeed = journalEntryList.length;
    for (const record of inferredRecordList) {
      const journalEntry = await this.covertInferredRecordToJournalEntry(record, serialSeed++, accountMap);
      journalEntryList.push(journalEntry);
    }

    // Populate currency sign and other accessories
    await this.injectCurencyAndOtherMetaDataToJournalEntries(journalEntryList);

    // Adjust date stamps for the opening balance
    await this.adjustOpeningBalanceDate(journalEntryList);

    accountingReturnCache = {
      accountMap,
      accountList,
      journalEntryList,
    };

    // return as an object
    return accountingReturnCache;
  }

  private async createOpeningBalanceEntriesForGivenListInner(beforeRangeEntryList: AccJournalEntry[], filters: AccJournalFilters, description: string) {
    const openingEntryList: AccJournalEntry[] = [];

    const currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
    for (const currency of currencyList) {
      const accountVsDebitBalance: Map<AccAccount, number> = new Map();
      for (const entry of beforeRangeEntryList) {
        for (const debit of entry.debitList) {
          if (debit.currencyId !== currency._id!) continue;
          if (!accountVsDebitBalance.has(debit.account)) {
            accountVsDebitBalance.set(debit.account, 0);
          }
          accountVsDebitBalance.set(debit.account, accountVsDebitBalance.get(debit.account)! + debit.amount);
        }

        for (const credit of entry.creditList) {
          if (credit.currencyId !== currency._id!) continue;
          if (!accountVsDebitBalance.has(credit.account)) {
            accountVsDebitBalance.set(credit.account, 0);
          }
          accountVsDebitBalance.set(credit.account, accountVsDebitBalance.get(credit.account)! - credit.amount);
        }
      }

      const debitList: AccDebitOrCredit[] = [];
      const creditList: AccDebitOrCredit[] = [];
      accountVsDebitBalance.forEach((balance, account) => {
        if (balance >= 0) {
          debitList.push({
            account,
            amount: asFinancialAmount(balance),
            currencyId: currency._id!,
          });
        } else {
          creditList.push({
            account,
            amount: asFinancialAmount(balance) * -1,
            currencyId: currency._id!,
          });
        }
      });

      const { currencyIdList, isMultiCurrency, isBalanced } = await this.checkJournalEntryBalance(debitList, creditList);

      const journalEntry: AccJournalEntry = {
        modality: "opening",
        serial: 0,
        entryEpoch: 0,
        creditList,
        debitList,
        description,
        notes: "",
        isMultiCurrency,
        isBalanced,
        currencyIdList,
      };

      openingEntryList.unshift(journalEntry);
    }

    return openingEntryList;
  }

  private async createOpeningBalanceEntriesForGivenList(journalEntryList: AccJournalEntry[], filters: AccJournalFilters) {
    const beforeRangeEntryList = journalEntryList.filter((entry) => entry.entryEpoch < filters.startEpoch);
    if (beforeRangeEntryList.length === 0) {
      return [];
    }

    const balancedBeforeRangeEntryList = beforeRangeEntryList.filter((entry) => entry.isBalanced);
    const balancedDescription = "Calculated Opening Balances from earlier transactions";
    const balancedOpeningEntryList = await this.createOpeningBalanceEntriesForGivenListInner(balancedBeforeRangeEntryList, filters, balancedDescription);

    const unbalancedBeforeRangeEntryList = beforeRangeEntryList.filter((entry) => !entry.isBalanced);
    const unbalancedDescription = "Calculated Opening Balances from earlier transactions involving multiple currencies";
    let unbalancedOpeningEntryList = await this.createOpeningBalanceEntriesForGivenListInner(unbalancedBeforeRangeEntryList, filters, unbalancedDescription);
    if (unbalancedOpeningEntryList.length > 1) {
      const firstEntry = unbalancedOpeningEntryList[0];
      for (let i = 1; i < unbalancedOpeningEntryList.length; i++) {
        firstEntry.creditList.push(...unbalancedOpeningEntryList[i].creditList);
        firstEntry.debitList.push(...unbalancedOpeningEntryList[i].debitList);
        firstEntry.currencyIdList.push(...unbalancedOpeningEntryList[i].currencyIdList);
        firstEntry.isBalanced = false;
        firstEntry.isMultiCurrency = true;
      }
      unbalancedOpeningEntryList = [firstEntry];
    }

    const openingEntryList: AccJournalEntry[] = [...balancedOpeningEntryList, ...unbalancedOpeningEntryList];

    return openingEntryList;
  }

  async applyJournalFilters(journalEntryList: AccJournalEntry[], filters: AccJournalFilters) {
    // Calculate opening balances for the given range
    const openingEntryList = await this.createOpeningBalanceEntriesForGivenList(journalEntryList, filters);

    // Populate currency sign and other accessories
    await this.injectCurencyAndOtherMetaDataToJournalEntries(openingEntryList);

    const withinRangeEntryList = journalEntryList.filter((entry) => entry.entryEpoch >= filters.startEpoch && entry.entryEpoch < filters.endEpoch);

    const filteredEntryList = [...openingEntryList, ...withinRangeEntryList];

    // Adjust date stamps for the opening balance
    await this.adjustOpeningBalanceDate(filteredEntryList);

    return filteredEntryList;
  }

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
          debitAmount: asFinancialAmount(debitAmount),
          creditAmount: asFinancialAmount(creditAmount),
          balance: asFinancialAmount(currencyIdVsBalanceMap[currencyId]),
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
          debitAmount: asFinancialAmount(debitAmount),
          creditAmount: asFinancialAmount(creditAmount),
          balance: asFinancialAmount(currencyIdVsBalanceMap[currencyId]),
          description: journalEntry.description,
          notes: journalEntry.notes,
          journalEntryRef: journalEntry,
        };

        ledgerEntryList.push(ledgerEntry);
      }
    }

    const balanceList = Object.keys(currencyIdVsBalanceMap).map((currencyId) => {
      return { currencyId, balance: asFinancialAmount(currencyIdVsBalanceMap[currencyId]) };
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

  private async closeTrialBalanceWithCurrency(
    currency: Currency,
    trialBalanceWithCurrency: AccTrialBalanceWithCurrency,
    accountMap: Record<string, AccAccount>
  ) {
    const retainedEarnings = asFinancialAmount(
      trialBalanceWithCurrency.trialBalanceOfTypeMap["Income"].totalBalance - trialBalanceWithCurrency.trialBalanceOfTypeMap["Expense"].totalBalance
    );

    const gapInPermanentBalance = asFinancialAmount(
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
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Asset"].totalBalance += asFinancialAmount(debitBalance);
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Asset"].balanceList.push({
          account,
          balance: asFinancialAmount(debitBalance),
          isBalanceDebit: true,
        });
      } else if (account.type === "Expense") {
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Expense"].isBalanceDebit = true;
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Expense"].totalBalance += asFinancialAmount(debitBalance);
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Expense"].balanceList.push({
          account,
          balance: asFinancialAmount(debitBalance),
          isBalanceDebit: true,
        });
      } else if (account.type === "Income") {
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Income"].isBalanceDebit = false;
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Income"].totalBalance -= asFinancialAmount(debitBalance);
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Income"].balanceList.push({
          account,
          balance: asFinancialAmount(debitBalance) * -1,
          isBalanceDebit: false,
        });
      } else if (account.type === "Liability") {
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Liability"].isBalanceDebit = false;
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Liability"].totalBalance -= asFinancialAmount(debitBalance);
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Liability"].balanceList.push({
          account,
          balance: asFinancialAmount(debitBalance) * -1,
          isBalanceDebit: false,
        });
      } else if (account.type === "Equity") {
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Equity"].isBalanceDebit = false;
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Equity"].totalBalance -= asFinancialAmount(debitBalance);
        trialBalanceWithCurrency.trialBalanceOfTypeMap["Equity"].balanceList.push({
          account,
          balance: asFinancialAmount(debitBalance) * -1,
          isBalanceDebit: false,
        });
      }
    }

    await this.closeTrialBalanceWithCurrency(currency, trialBalanceWithCurrency, accountMap);

    Object.keys(trialBalanceWithCurrency.trialBalanceOfTypeMap).forEach((key) => {
      const tbType = trialBalanceWithCurrency.trialBalanceOfTypeMap[key];
      tbType.totalBalance = asFinancialAmount(tbType.totalBalance);
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

export const accountingService = new AccountingService();
