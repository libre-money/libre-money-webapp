import { AccDefaultAccounts } from "src/constants/accounting-constants";
import { PROMISE_POOL_CONCURRENCY_LIMT, RECORD_BATCH_PROCESSING_OPTIMIZATION_THRESHOLD } from "src/constants/config-constants";
import { Collection, RecordType } from "src/constants/constants";
import { AccAccount } from "src/models/accounting/acc-account";
import { AccDebitOrCredit, AccJournalEntry } from "src/models/accounting/acc-journal-entry";
import { AccJournalFilters } from "src/models/accounting/acc-journal-filters";
import { Asset } from "src/schemas/asset";
import { Currency } from "src/schemas/currency";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { Record as SourceRecord } from "src/schemas/record";
import { Wallet } from "src/schemas/wallet";
import { asAmount, printAmount } from "src/utils/de-facto-utils";
import PromisePool from "src/utils/promise-pool";
import { accountingLedgerService } from "./accounting-ledger-service";
import { accountingTrialBalanceService } from "./accounting-trial-balance-service";
import { pouchdbService } from "./pouchdb-service";
import { recordService } from "./record-service";

export type AccAccountingReturnable = {
  accountMap: Record<string, AccAccount>;
  accountList: AccAccount[];
  journalEntryList: AccJournalEntry[];
};

let accountingReturnCache: AccAccountingReturnable | null = null;

pouchdbService.registerChangeListener(() => {
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

    let inferredRecordList: InferredRecord[];
    if (rawRecordList.length < RECORD_BATCH_PROCESSING_OPTIMIZATION_THRESHOLD) {
      let completedCount = 0;
      inferredRecordList = await PromisePool.mapList(rawRecordList, PROMISE_POOL_CONCURRENCY_LIMT, async (rawData: SourceRecord) => {
        const result = await recordService.inferRecord(rawData);
        completedCount += 1;
        if (completedCount % Math.floor(rawRecordList.length / 10) === 0) {
          progressNotifierFn(completedCount / rawRecordList.length);
        }
        return result;
      });
      progressNotifierFn(1);
    } else {
      inferredRecordList = await recordService.inferInBatch(rawRecordList);
    }

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
          amount: asAmount(asset.initialBalance),
        });

        assetEquity += asAmount(asset.initialBalance);
      }
      creditList.push({
        account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
        currencyId: currency._id!,
        amount: asAmount(assetEquity),
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
              amount: asAmount(wallet.initialBalance) * -1,
            });
            debitList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asAmount(wallet.initialBalance) * -1,
            });
          } else {
            // Credit Card had advance payment. We have to treat it like an asset OR a contra-liability
            debitList.push({
              account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
              currencyId: wallet.currencyId,
              amount: asAmount(wallet.initialBalance),
            });
            creditList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asAmount(wallet.initialBalance),
            });
          }
        } else if (wallet.type === "cash") {
          // Account for initial negative balance
          if (wallet.initialBalance < 0) {
            creditList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
              currencyId: wallet.currencyId,
              amount: asAmount(wallet.initialBalance) * -1,
            });
            debitList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asAmount(wallet.initialBalance) * -1,
            });
          } else {
            debitList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
              currencyId: wallet.currencyId,
              amount: asAmount(wallet.initialBalance),
            });
            creditList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asAmount(wallet.initialBalance),
            });
          }
        } else {
          // Account for initial negative balance
          if (wallet.initialBalance < 0) {
            creditList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
              currencyId: wallet.currencyId,
              amount: asAmount(wallet.initialBalance) * -1,
            });
            debitList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asAmount(wallet.initialBalance) * -1,
            });
          } else {
            debitList.push({
              account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
              currencyId: wallet.currencyId,
              amount: asAmount(wallet.initialBalance),
            });
            creditList.push({
              account: accountMap[AccDefaultAccounts.EQUITY__OPENING_BALANCE.code],
              currencyId: currency._id!,
              amount: asAmount(wallet.initialBalance),
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
      amount: asAmount(expense.amount),
    });
    description += `Spent ${printAmount(expense.amount, expense.currencyId)} as "${expense.expenseAvenue.name}". `;

    if (expense.amountPaid > 0) {
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
      amount: asAmount(income.amount),
    });
    description += `Earned ${printAmount(income.amount, income.currencyId)} as "${income.incomeSource.name}". `;

    if (income.amountPaid > 0) {
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
        debitList.push({
          account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
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
        amount: asAmount(moneyTransfer.fromAmount),
      });
    } else if (moneyTransfer.fromWallet.type === "cash") {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: moneyTransfer.fromCurrencyId,
        amount: asAmount(moneyTransfer.fromAmount),
      });
    } else {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: moneyTransfer.fromCurrencyId,
        amount: asAmount(moneyTransfer.fromAmount),
      });
    }

    // Target
    if (moneyTransfer.toWallet.type === "credit-card") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
        currencyId: moneyTransfer.toCurrencyId,
        amount: asAmount(moneyTransfer.toAmount),
      });
    } else if (moneyTransfer.toWallet.type === "cash") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: moneyTransfer.toCurrencyId,
        amount: asAmount(moneyTransfer.toAmount),
      });
    } else {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: moneyTransfer.toCurrencyId,
        amount: asAmount(moneyTransfer.toAmount),
      });
    }

    if (moneyTransfer.fromAmount === moneyTransfer.toAmount && moneyTransfer.fromCurrencyId === moneyTransfer.toCurrencyId) {
      description += `Transfered ${printAmount(moneyTransfer.fromAmount, moneyTransfer.fromCurrencyId)} from
      "${moneyTransfer.fromWallet.name}" to "${moneyTransfer.toWallet.name}". `;
    } else {
      description += `Transfered ${printAmount(moneyTransfer.fromAmount, moneyTransfer.fromCurrencyId)} from
      "${moneyTransfer.fromWallet.name}" into ${printAmount(moneyTransfer.toAmount, moneyTransfer.toCurrencyId)}
       on "${moneyTransfer.toWallet.name}". `;
    }

    if (moneyTransfer.toCurrencyId === moneyTransfer.fromCurrencyId) {
      if (asAmount(moneyTransfer.fromAmount) > asAmount(moneyTransfer.toAmount)) {
        const diff = asAmount(moneyTransfer.fromAmount) - asAmount(moneyTransfer.toAmount);
        debitList.push({
          account: accountMap[AccDefaultAccounts.EXPENSE__MINOR_ADJUSTMENT.code],
          currencyId: moneyTransfer.toCurrencyId,
          amount: diff,
        });
        description += `Transfer fee: ${printAmount(diff, moneyTransfer.toCurrencyId)}. `;
      } else if (asAmount(moneyTransfer.fromAmount) < asAmount(moneyTransfer.toAmount)) {
        const diff = asAmount(moneyTransfer.toAmount) - asAmount(moneyTransfer.fromAmount);
        debitList.push({
          account: accountMap[AccDefaultAccounts.INCOME__MINOR_ADJUSTMENT.code],
          currencyId: moneyTransfer.toCurrencyId,
          amount: diff,
        });
        description += `Gained during transfer: ${printAmount(diff, moneyTransfer.toCurrencyId)}. `;
      }
    }

    // Equity offset to maintain separate accounts across multiple currencies. See Issue #20
    if (moneyTransfer.toCurrencyId !== moneyTransfer.fromCurrencyId) {
      debitList.push({
        account: accountMap[AccDefaultAccounts.EQUITY__INTERCURRENCY.code],
        currencyId: moneyTransfer.fromCurrencyId,
        amount: asAmount(moneyTransfer.fromAmount),
      });

      creditList.push({
        account: accountMap[AccDefaultAccounts.EQUITY__INTERCURRENCY.code],
        currencyId: moneyTransfer.toCurrencyId,
        amount: asAmount(moneyTransfer.toAmount),
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
      amount: asAmount(assetPurchase.amount),
    });
    description += `Purchased asset "${assetPurchase.asset.name}" for ${printAmount(assetPurchase.amount, assetPurchase.currencyId)}. `;

    if (assetPurchase.amountPaid > 0 && assetPurchase.wallet) {
      if (assetPurchase.wallet.type === "credit-card") {
        creditList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
          currencyId: assetPurchase.currencyId,
          amount: asAmount(assetPurchase.amountPaid),
        });
      } else if (assetPurchase.wallet.type === "cash") {
        creditList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
          currencyId: assetPurchase.currencyId,
          amount: asAmount(assetPurchase.amountPaid),
        });
      } else {
        creditList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
          currencyId: assetPurchase.currencyId,
          amount: asAmount(assetPurchase.amountPaid),
        });
      }
      if (assetPurchase.amount === assetPurchase.amountPaid) {
        description += `Fully paid from "${assetPurchase.wallet.name}" (${assetPurchase.wallet.type}). `;
      } else {
        creditList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
          currencyId: assetPurchase.currencyId,
          amount: asAmount(assetPurchase.amount) - asAmount(assetPurchase.amountPaid),
        });
        description += `Partially paid from "${assetPurchase.wallet.name}" (${assetPurchase.wallet.type}). `;
      }
    } else {
      creditList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
        currencyId: assetPurchase.currencyId,
        amount: asAmount(assetPurchase.amount),
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
      amount: asAmount(assetSale.amount),
    });
    description += `Sold asset "${assetSale.asset.name}" for ${printAmount(assetSale.amount, assetSale.currencyId)}. `;

    if (assetSale.amountPaid > 0) {
      if (assetSale.wallet.type === "credit-card") {
        debitList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
          currencyId: assetSale.currencyId,
          amount: asAmount(assetSale.amountPaid),
        });
      } else if (assetSale.wallet.type === "cash") {
        debitList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
          currencyId: assetSale.currencyId,
          amount: asAmount(assetSale.amountPaid),
        });
      } else {
        debitList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
          currencyId: assetSale.currencyId,
          amount: asAmount(assetSale.amountPaid),
        });
      }
      if (assetSale.amount === assetSale.amountPaid) {
        description += `Fully received payment in "${assetSale.wallet.name}" (${assetSale.wallet.type}). `;
      } else {
        creditList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
          currencyId: assetSale.currencyId,
          amount: asAmount(assetSale.amount) - asAmount(assetSale.amountPaid),
        });
        description += `Partially received payment in "${assetSale.wallet.name}" (${assetSale.wallet.type}). `;
      }
    } else {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
        currencyId: assetSale.currencyId,
        amount: asAmount(assetSale.amount),
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
        amount: asAmount(assetAppreciationDepreciation.amount),
      });
      creditList.push({
        account: accountMap[AccDefaultAccounts.INCOME__ASSET_APPRECIATION.code],
        currencyId: assetAppreciationDepreciation.currencyId,
        amount: asAmount(assetAppreciationDepreciation.amount),
      });
      description += `Asset "${assetAppreciationDepreciation.asset.name}" appreciated by ${printAmount(
        assetAppreciationDepreciation.amount,
        assetAppreciationDepreciation.currencyId
      )}. `;
    } else {
      creditList.push({
        account: accountMap[liquidityLookup[assetAppreciationDepreciation.asset.liquidity]],
        currencyId: assetAppreciationDepreciation.currencyId,
        amount: asAmount(assetAppreciationDepreciation.amount),
      });
      debitList.push({
        account: accountMap[AccDefaultAccounts.EXPENSE__ASSET_DEPRECIATION.code],
        currencyId: assetAppreciationDepreciation.currencyId,
        amount: asAmount(assetAppreciationDepreciation.amount),
      });

      description += `Asset "${assetAppreciationDepreciation.asset.name}" depreciated by ${printAmount(
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
      amount: asAmount(lending.amount),
    });
    description += `Lent ${printAmount(lending.amount, lending.currencyId)} to "${lending.party.name}"
     from "${lending.wallet.name}". `;

    if (lending.wallet.type === "credit-card") {
      creditList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
        currencyId: lending.currencyId,
        amount: asAmount(lending.amount),
      });
    } else if (lending.wallet.type === "cash") {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: lending.currencyId,
        amount: asAmount(lending.amount),
      });
    } else {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: lending.currencyId,
        amount: asAmount(lending.amount),
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
      amount: asAmount(borrowing.amount),
    });
    description += `Borrowed ${printAmount(borrowing.amount, borrowing.currencyId)} from "${borrowing.party.name}"
     into "${borrowing.wallet.name}". `;

    if (borrowing.wallet.type === "credit-card") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
        currencyId: borrowing.currencyId,
        amount: asAmount(borrowing.amount),
      });
    } else if (borrowing.wallet.type === "cash") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: borrowing.currencyId,
        amount: asAmount(borrowing.amount),
      });
    } else {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: borrowing.currencyId,
        amount: asAmount(borrowing.amount),
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
      amount: asAmount(repaymentReceived.amount),
    });
    description += `Repayment received of ${printAmount(repaymentReceived.amount, repaymentReceived.currencyId)}
          from "${repaymentReceived.party.name}"
          into "${repaymentReceived.wallet.name}". `;

    if (repaymentReceived.wallet.type === "credit-card") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
        currencyId: repaymentReceived.currencyId,
        amount: asAmount(repaymentReceived.amount),
      });
    } else if (repaymentReceived.wallet.type === "cash") {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: repaymentReceived.currencyId,
        amount: asAmount(repaymentReceived.amount),
      });
    } else {
      debitList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: repaymentReceived.currencyId,
        amount: asAmount(repaymentReceived.amount),
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
      amount: asAmount(repaymentGiven.amount),
    });
    description += `Repayment given of ${printAmount(repaymentGiven.amount, repaymentGiven.currencyId)}
          to "${repaymentGiven.party.name}"
          from "${repaymentGiven.wallet.name}". `;

    if (repaymentGiven.wallet.type === "credit-card") {
      creditList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
        currencyId: repaymentGiven.currencyId,
        amount: asAmount(repaymentGiven.amount),
      });
    } else if (repaymentGiven.wallet.type === "cash") {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
        currencyId: repaymentGiven.currencyId,
        amount: asAmount(repaymentGiven.amount),
      });
    } else {
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
        currencyId: repaymentGiven.currencyId,
        amount: asAmount(repaymentGiven.amount),
      });
    }

    return { creditList, debitList, description };
  }

  private async convertPayablePayment(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { payablePayment } = record;
    if (!payablePayment) throw new Error("Malformatted Data");

    // Check if this is a write-off (walletId = "write-off")
    const isWriteOff = payablePayment.walletId === "write-off";

    if (isWriteOff) {
      // Write-off: Reduce liability without using cash
      debitList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
        currencyId: payablePayment.currencyId,
        amount: asAmount(payablePayment.amount),
      });
      // Credit to a gain/waived expense account
      creditList.push({
        account: accountMap[AccDefaultAccounts.INCOME__OTHER_INCOME.code],
        currencyId: payablePayment.currencyId,
        amount: asAmount(payablePayment.amount),
      });
      description += `Payable written off: ${printAmount(payablePayment.amount, payablePayment.currencyId)} for "${payablePayment.party?.name || "Unknown"}". `;
    } else {
      // Normal payment: Reduce liability and cash
      debitList.push({
        account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
        currencyId: payablePayment.currencyId,
        amount: asAmount(payablePayment.amount),
      });
      description += `Payment made of ${printAmount(payablePayment.amount, payablePayment.currencyId)} to "${payablePayment.party?.name || "Unknown"}" from "${payablePayment.wallet?.name || "Unknown"}". `;

      if (payablePayment.wallet?.type === "credit-card") {
        creditList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
          currencyId: payablePayment.currencyId,
          amount: asAmount(payablePayment.amount),
        });
      } else if (payablePayment.wallet?.type === "cash") {
        creditList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
          currencyId: payablePayment.currencyId,
          amount: asAmount(payablePayment.amount),
        });
      } else {
        creditList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
          currencyId: payablePayment.currencyId,
          amount: asAmount(payablePayment.amount),
        });
      }
    }

    return { creditList, debitList, description };
  }

  private async convertReceivableReceipt(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { receivableReceipt } = record;
    if (!receivableReceipt) throw new Error("Malformatted Data");

    // Check if this is a write-off (walletId = "write-off")
    const isWriteOff = receivableReceipt.walletId === "write-off";

    if (isWriteOff) {
      // Write-off: Bad debt expense
      debitList.push({
        account: accountMap[AccDefaultAccounts.EXPENSE__BAD_DEBT_EXPENSE.code],
        currencyId: receivableReceipt.currencyId,
        amount: asAmount(receivableReceipt.amount),
      });
      // Credit to reduce accounts receivable
      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
        currencyId: receivableReceipt.currencyId,
        amount: asAmount(receivableReceipt.amount),
      });
      description += `Receivable written off as bad debt: ${printAmount(receivableReceipt.amount, receivableReceipt.currencyId)} from "${receivableReceipt.party?.name || "Unknown"}". `;
    } else {
      // Normal receipt: Increase cash, reduce receivable
      description += `Receipt of ${printAmount(receivableReceipt.amount, receivableReceipt.currencyId)} from "${receivableReceipt.party?.name || "Unknown"}" to "${receivableReceipt.wallet?.name || "Unknown"}". `;

      if (receivableReceipt.wallet?.type === "credit-card") {
        debitList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__CREDIT_CARD_DEBT.code],
          currencyId: receivableReceipt.currencyId,
          amount: asAmount(receivableReceipt.amount),
        });
      } else if (receivableReceipt.wallet?.type === "cash") {
        debitList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__CASH.code],
          currencyId: receivableReceipt.currencyId,
          amount: asAmount(receivableReceipt.amount),
        });
      } else {
        debitList.push({
          account: accountMap[AccDefaultAccounts.ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT.code],
          currencyId: receivableReceipt.currencyId,
          amount: asAmount(receivableReceipt.amount),
        });
      }

      creditList.push({
        account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
        currencyId: receivableReceipt.currencyId,
        amount: asAmount(receivableReceipt.amount),
      });
    }

    return { creditList, debitList, description };
  }

  private async convertLoanForgivenessGiven(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { loanForgivenessGiven } = record;
    if (!loanForgivenessGiven) throw new Error("Malformatted Data");

    // Determine if it's a gift or bad debt based on reason
    const isGift = loanForgivenessGiven.reason === "gift";

    if (isGift) {
      // Debit: Gift Expense
      debitList.push({
        account: accountMap[AccDefaultAccounts.EXPENSE__GIFT_EXPENSE.code],
        currencyId: loanForgivenessGiven.currencyId,
        amount: asAmount(loanForgivenessGiven.amountForgiven),
      });
      description += `Loan forgiven as gift: ${printAmount(loanForgivenessGiven.amountForgiven, loanForgivenessGiven.currencyId)} for "${loanForgivenessGiven.party?.name || "Unknown"}". `;
    } else {
      // Debit: Bad Debt Expense
      debitList.push({
        account: accountMap[AccDefaultAccounts.EXPENSE__BAD_DEBT_EXPENSE.code],
        currencyId: loanForgivenessGiven.currencyId,
        amount: asAmount(loanForgivenessGiven.amountForgiven),
      });
      description += `Loan written off as bad debt: ${printAmount(loanForgivenessGiven.amountForgiven, loanForgivenessGiven.currencyId)} from "${loanForgivenessGiven.party?.name || "Unknown"}". `;
    }

    // Credit: Reduce Loans Receivable (Accounts Receivable)
    creditList.push({
      account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
      currencyId: loanForgivenessGiven.currencyId,
      amount: asAmount(loanForgivenessGiven.amountForgiven),
    });

    return { creditList, debitList, description };
  }

  private async convertLoanForgivenessReceived(record: InferredRecord, accountMap: Record<string, AccAccount>) {
    const creditList: AccDebitOrCredit[] = [];
    const debitList: AccDebitOrCredit[] = [];
    let description = "";
    const { loanForgivenessReceived } = record;
    if (!loanForgivenessReceived) throw new Error("Malformatted Data");

    // Determine if it's a gift or debt forgiveness income based on reason
    const isGift = loanForgivenessReceived.reason === "gift";

    // Debit: Reduce Liability (Accounts Payable / Loans Payable)
    debitList.push({
      account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
      currencyId: loanForgivenessReceived.currencyId,
      amount: asAmount(loanForgivenessReceived.amountForgiven),
    });

    if (isGift) {
      // Credit: Gift Income
      creditList.push({
        account: accountMap[AccDefaultAccounts.INCOME__GIFT_INCOME.code],
        currencyId: loanForgivenessReceived.currencyId,
        amount: asAmount(loanForgivenessReceived.amountForgiven),
      });
      description += `Debt forgiven as gift: ${printAmount(loanForgivenessReceived.amountForgiven, loanForgivenessReceived.currencyId)} by "${loanForgivenessReceived.party?.name || "Unknown"}". `;
    } else {
      // Credit: Debt Forgiveness Income
      creditList.push({
        account: accountMap[AccDefaultAccounts.INCOME__OTHER_INCOME.code],
        currencyId: loanForgivenessReceived.currencyId,
        amount: asAmount(loanForgivenessReceived.amountForgiven),
      });
      description += `Debt forgiven: ${printAmount(loanForgivenessReceived.amountForgiven, loanForgivenessReceived.currencyId)} by "${loanForgivenessReceived.party?.name || "Unknown"}". `;
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
    // ================ PAYABLE_PAYMENT
    else if (record.type === RecordType.PAYABLE_PAYMENT && record.payablePayment) {
      ({ creditList, debitList, description } = await this.convertPayablePayment(record, accountMap));
    }
    // ================ RECEIVABLE_RECEIPT
    else if (record.type === RecordType.RECEIVABLE_RECEIPT && record.receivableReceipt) {
      ({ creditList, debitList, description } = await this.convertReceivableReceipt(record, accountMap));
    }
    // ================ LOAN_FORGIVENESS_GIVEN
    else if (record.type === RecordType.LOAN_FORGIVENESS_GIVEN && record.loanForgivenessGiven) {
      ({ creditList, debitList, description } = await this.convertLoanForgivenessGiven(record, accountMap));
    }
    // ================ LOAN_FORGIVENESS_RECEIVED
    else if (record.type === RecordType.LOAN_FORGIVENESS_RECEIVED && record.loanForgivenessReceived) {
      ({ creditList, debitList, description } = await this.convertLoanForgivenessReceived(record, accountMap));
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
            amount: asAmount(balance),
            currencyId: currency._id!,
          });
        } else {
          creditList.push({
            account,
            amount: asAmount(balance) * -1,
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

  // ----- Ledger
  async generateLedgerFromJournal(journalEntryList: AccJournalEntry[], accountMap: Record<string, AccAccount>, accountCode: string) {
    const ledger = await accountingLedgerService.generateLedgerFromJournal(journalEntryList, accountMap, accountCode);
    return ledger;
  }

  // ----- Trial Balance
  async generateTrialBalanceFromJournal(journalEntryList: AccJournalEntry[], accountMap: Record<string, AccAccount>) {
    const trialBalance = await accountingTrialBalanceService.generateTrialBalanceFromJournal(journalEntryList, accountMap);
    return trialBalance;
  }
}

export const accountingService = new AccountingService();
