import { AccDefaultAccounts } from "src/constants/accounting-constants";
import { AccAccount } from "src/models/accounting/acc-account";
import { dataInferenceService } from "./data-inference-service";
import { pouchdbService } from "./pouchdb-service";
import { Collection, RecordType, assetLiquidityList, walletTypeList } from "src/constants/constants";
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

        debitList.push({
          account: accountMap[AccDefaultAccounts.EXPENSE__COMBINED_EXPENSE.code],
          currencyId: expense.currencyId,
          amount: asAmount(expense.amount),
        });
        description += `Spent ${dataInferenceService.getPrintableAmount(expense.amount, expense.currencyId)} as "${expense.expenseAvenue.name}". `;

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

        creditList.push({
          account: accountMap[AccDefaultAccounts.INCOME__COMBINED_INCOME.code],
          currencyId: income.currencyId,
          amount: asAmount(income.amount),
        });
        description += `Earned ${dataInferenceService.getPrintableAmount(income.amount, income.currencyId)} as "${income.incomeSource.name}". `;

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
      // ================ MONEY TRANSFER
      else if (record.type === RecordType.MONEY_TRANSFER && record.moneyTransfer) {
        const { moneyTransfer } = record;

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
          description += `Transfered ${dataInferenceService.getPrintableAmount(moneyTransfer.fromAmount, moneyTransfer.fromCurrencyId)} from 
          "${moneyTransfer.fromWallet.name}" to "${moneyTransfer.toWallet.name}". `;
        } else {
          description += `Transfered ${dataInferenceService.getPrintableAmount(moneyTransfer.fromAmount, moneyTransfer.fromCurrencyId)} from 
          "${moneyTransfer.fromWallet.name}" into ${dataInferenceService.getPrintableAmount(moneyTransfer.toAmount, moneyTransfer.toCurrencyId)}
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
            description += `Transfer fee: ${dataInferenceService.getPrintableAmount(diff, moneyTransfer.toCurrencyId)}. `;
          } else if (asAmount(moneyTransfer.fromAmount) < asAmount(moneyTransfer.toAmount)) {
            const diff = asAmount(moneyTransfer.toAmount) - asAmount(moneyTransfer.fromAmount);
            debitList.push({
              account: accountMap[AccDefaultAccounts.INCOME__MINOR_ADJUSTMENT.code],
              currencyId: moneyTransfer.toCurrencyId,
              amount: diff,
            });
            description += `Gained during transfer: ${dataInferenceService.getPrintableAmount(diff, moneyTransfer.toCurrencyId)}. `;
          }
        }
      }
      // ================ ASSET_PURCHASE
      else if (record.type === RecordType.ASSET_PURCHASE && record.assetPurchase) {
        const { assetPurchase } = record;

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
        description += `Purchased asset "${assetPurchase.asset.name}" for ${dataInferenceService.getPrintableAmount(
          assetPurchase.amount,
          assetPurchase.currencyId
        )}. `;

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
      }
      // ================ ASSET_SALE
      else if (record.type === RecordType.ASSET_SALE && record.assetSale) {
        const { assetSale } = record;

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
        description += `Sold asset "${assetSale.asset.name}" for ${dataInferenceService.getPrintableAmount(assetSale.amount, assetSale.currencyId)}. `;

        if (assetSale.amountPaid > 0 && assetSale.wallet) {
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
      }
      // ================ ASSET_APPRECIATION_DEPRECIATION
      else if (record.type === RecordType.ASSET_APPRECIATION_DEPRECIATION && record.assetAppreciationDepreciation) {
        const { assetAppreciationDepreciation } = record;

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
          description += `Asset "${assetAppreciationDepreciation.asset.name}" appreciated by ${dataInferenceService.getPrintableAmount(
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

          description += `Asset "${assetAppreciationDepreciation.asset.name}" depreciated by ${dataInferenceService.getPrintableAmount(
            assetAppreciationDepreciation.amount,
            assetAppreciationDepreciation.currencyId
          )}. `;
        }
      }
      // ================ LENDING
      else if (record.type === RecordType.LENDING && record.lending) {
        const { lending } = record;

        debitList.push({
          account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
          currencyId: lending.currencyId,
          amount: asAmount(lending.amount),
        });
        description += `Lent ${dataInferenceService.getPrintableAmount(lending.amount, lending.currencyId)} to "${lending.party.name}"
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
      }
      // ================ BORROWING
      else if (record.type === RecordType.BORROWING && record.borrowing) {
        const { borrowing } = record;

        creditList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
          currencyId: borrowing.currencyId,
          amount: asAmount(borrowing.amount),
        });
        description += `Borrowed ${dataInferenceService.getPrintableAmount(borrowing.amount, borrowing.currencyId)} from "${borrowing.party.name}"
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
      }
      // ================ REPAYMENT_RECEIVED
      else if (record.type === RecordType.REPAYMENT_RECEIVED && record.repaymentReceived) {
        const { repaymentReceived } = record;

        creditList.push({
          account: accountMap[AccDefaultAccounts.ASSET__ACCOUNTS_RECEIVABLE.code],
          currencyId: repaymentReceived.currencyId,
          amount: asAmount(repaymentReceived.amount),
        });
        description += `Repayment received of ${dataInferenceService.getPrintableAmount(repaymentReceived.amount, repaymentReceived.currencyId)}
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
      }
      // ================ REPAYMENT_GIVEN
      else if (record.type === RecordType.REPAYMENT_GIVEN && record.repaymentGiven) {
        const { repaymentGiven } = record;

        debitList.push({
          account: accountMap[AccDefaultAccounts.LIABILITY__ACCOUNTS_PAYABLE.code],
          currencyId: repaymentGiven.currencyId,
          amount: asAmount(repaymentGiven.amount),
        });
        description += `Repayment given of ${dataInferenceService.getPrintableAmount(repaymentGiven.amount, repaymentGiven.currencyId)} 
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
