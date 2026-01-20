import { Collection, RecordType } from "src/constants/constants";
import { UNBUDGETED_RECORDS_BUDGET_NAME } from "src/constants/config-constants";
import { Asset } from "src/schemas/asset";
import { Currency } from "src/schemas/currency";
import { ExpenseAvenue } from "src/schemas/expense-avenue";
import { IncomeSource } from "src/schemas/income-source";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { RecordFilters } from "src/models/inferred/record-filters";
import { Party } from "src/schemas/party";
import { Record } from "src/schemas/record";
import { Tag } from "src/schemas/tag";
import { Wallet } from "src/schemas/wallet";
import { normalizeEpochRange } from "src/utils/date-utils";
import { deepClone, sleep } from "src/utils/misc-utils";
import { entityService } from "./entity-service";
import { pouchdbService } from "./pouchdb-service";
import { rollingBudgetService } from "./rolling-budget-service";

class RecordService {
  async inferRecord(record: Record): Promise<InferredRecord> {
    const inferredRecord = deepClone(record) as InferredRecord;

    (await this.inferExpense(inferredRecord)) ||
      (await this.inferIncome(inferredRecord)) ||
      (await this.inferMoneyTransfer(inferredRecord)) ||
      (await this.inferLending(inferredRecord)) ||
      (await this.inferBorrowing(inferredRecord)) ||
      (await this.inferRepaymentGiven(inferredRecord)) ||
      (await this.inferRepaymentReceived(inferredRecord)) ||
      (await this.inferPayablePayment(inferredRecord)) ||
      (await this.inferReceivableReceipt(inferredRecord)) ||
      (await this.inferLoanForgivenessGiven(inferredRecord)) ||
      (await this.inferLoanForgivenessReceived(inferredRecord)) ||
      (await this.inferAssetPurchase(inferredRecord)) ||
      (await this.inferAssetSale(inferredRecord)) ||
      (await this.inferAssetAppreciationDepreciation(inferredRecord));

    inferredRecord.typePrettified = inferredRecord.type.replace(/\-/g, " ");
    inferredRecord.tagList = await entityService.getTagList(inferredRecord.tagIdList);

    return inferredRecord;
  }

  private async inferExpense(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.EXPENSE && inferredRecord.expense)) return false;

    inferredRecord.expense.expenseAvenue = await entityService.getExpenseAvenue(inferredRecord.expense.expenseAvenueId);

    if (inferredRecord.expense.partyId) {
      inferredRecord.expense.party = await entityService.getParty(inferredRecord.expense.partyId);
    }

    if (inferredRecord.expense.walletId) {
      inferredRecord.expense.wallet = await entityService.getWallet(inferredRecord.expense.walletId);
    }
    return true;
  }

  private async inferIncome(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.INCOME && inferredRecord.income)) return false;

    inferredRecord.income.incomeSource = await entityService.getExpenseAvenue(inferredRecord.income.incomeSourceId);

    if (inferredRecord.income.partyId) {
      inferredRecord.income.party = await entityService.getParty(inferredRecord.income.partyId);
    }

    if (inferredRecord.income.walletId) {
      inferredRecord.income.wallet = await entityService.getWallet(inferredRecord.income.walletId);
    }

    return true;
  }

  private async inferMoneyTransfer(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.MONEY_TRANSFER && inferredRecord.moneyTransfer)) return false;

    if (inferredRecord.moneyTransfer.fromWalletId) {
      inferredRecord.moneyTransfer.fromWallet = await entityService.getWallet(inferredRecord.moneyTransfer.fromWalletId);
    }
    if (inferredRecord.moneyTransfer.toWalletId) {
      inferredRecord.moneyTransfer.toWallet = await entityService.getWallet(inferredRecord.moneyTransfer.toWalletId);
    }

    return true;
  }

  private async inferLending(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.LENDING && inferredRecord.lending)) return false;

    if (inferredRecord.lending.partyId) {
      inferredRecord.lending.party = await entityService.getParty(inferredRecord.lending.partyId);
    }

    if (inferredRecord.lending.walletId) {
      inferredRecord.lending.wallet = await entityService.getWallet(inferredRecord.lending.walletId);
    }

    return true;
  }

  private async inferBorrowing(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.BORROWING && inferredRecord.borrowing)) return false;

    if (inferredRecord.borrowing.partyId) {
      inferredRecord.borrowing.party = await entityService.getParty(inferredRecord.borrowing.partyId);
    }

    if (inferredRecord.borrowing.walletId) {
      inferredRecord.borrowing.wallet = await entityService.getWallet(inferredRecord.borrowing.walletId);
    }

    return true;
  }

  private async inferRepaymentGiven(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.REPAYMENT_GIVEN && inferredRecord.repaymentGiven)) return false;

    if (inferredRecord.repaymentGiven.partyId) {
      inferredRecord.repaymentGiven.party = await entityService.getParty(inferredRecord.repaymentGiven.partyId);
    }

    if (inferredRecord.repaymentGiven.walletId) {
      inferredRecord.repaymentGiven.wallet = await entityService.getWallet(inferredRecord.repaymentGiven.walletId);
    }

    return true;
  }

  private async inferRepaymentReceived(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.REPAYMENT_RECEIVED && inferredRecord.repaymentReceived)) return false;

    if (inferredRecord.repaymentReceived.partyId) {
      inferredRecord.repaymentReceived.party = await entityService.getParty(inferredRecord.repaymentReceived.partyId);
    }

    if (inferredRecord.repaymentReceived.walletId) {
      inferredRecord.repaymentReceived.wallet = await entityService.getWallet(inferredRecord.repaymentReceived.walletId);
    }

    return true;
  }

  private async inferPayablePayment(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.PAYABLE_PAYMENT && inferredRecord.payablePayment)) return false;

    if (inferredRecord.payablePayment.partyId) {
      inferredRecord.payablePayment.party = await entityService.getParty(inferredRecord.payablePayment.partyId);
    }

    // Only infer wallet if it's not a write-off
    if (inferredRecord.payablePayment.walletId && inferredRecord.payablePayment.walletId !== "write-off") {
      inferredRecord.payablePayment.wallet = await entityService.getWallet(inferredRecord.payablePayment.walletId);
    }

    return true;
  }

  private async inferReceivableReceipt(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.RECEIVABLE_RECEIPT && inferredRecord.receivableReceipt)) return false;

    if (inferredRecord.receivableReceipt.partyId) {
      inferredRecord.receivableReceipt.party = await entityService.getParty(inferredRecord.receivableReceipt.partyId);
    }

    // Only infer wallet if it's not a write-off
    if (inferredRecord.receivableReceipt.walletId && inferredRecord.receivableReceipt.walletId !== "write-off") {
      inferredRecord.receivableReceipt.wallet = await entityService.getWallet(inferredRecord.receivableReceipt.walletId);
    }

    return true;
  }

  private async inferLoanForgivenessGiven(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.LOAN_FORGIVENESS_GIVEN && inferredRecord.loanForgivenessGiven)) return false;

    if (inferredRecord.loanForgivenessGiven.partyId) {
      inferredRecord.loanForgivenessGiven.party = await entityService.getParty(inferredRecord.loanForgivenessGiven.partyId);
    }

    return true;
  }

  private async inferLoanForgivenessReceived(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.LOAN_FORGIVENESS_RECEIVED && inferredRecord.loanForgivenessReceived)) return false;

    if (inferredRecord.loanForgivenessReceived.partyId) {
      inferredRecord.loanForgivenessReceived.party = await entityService.getParty(inferredRecord.loanForgivenessReceived.partyId);
    }

    return true;
  }

  private async inferAssetPurchase(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.ASSET_PURCHASE && inferredRecord.assetPurchase)) return false;

    if (inferredRecord.assetPurchase.partyId) {
      inferredRecord.assetPurchase.party = await entityService.getParty(inferredRecord.assetPurchase.partyId);
    }

    if (inferredRecord.assetPurchase.walletId) {
      inferredRecord.assetPurchase.wallet = await entityService.getWallet(inferredRecord.assetPurchase.walletId);
    }

    if (inferredRecord.assetPurchase.assetId) {
      inferredRecord.assetPurchase.asset = await entityService.getAsset(inferredRecord.assetPurchase.assetId);
    }

    return true;
  }

  private async inferAssetSale(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.ASSET_SALE && inferredRecord.assetSale)) return false;

    if (inferredRecord.assetSale.partyId) {
      inferredRecord.assetSale.party = await entityService.getParty(inferredRecord.assetSale.partyId);
    }

    if (inferredRecord.assetSale.walletId) {
      inferredRecord.assetSale.wallet = await entityService.getWallet(inferredRecord.assetSale.walletId);
    }

    if (inferredRecord.assetSale.assetId) {
      inferredRecord.assetSale.asset = await entityService.getAsset(inferredRecord.assetSale.assetId);
    }

    return true;
  }

  private async inferAssetAppreciationDepreciation(inferredRecord: InferredRecord) {
    if (!(inferredRecord.type === RecordType.ASSET_APPRECIATION_DEPRECIATION && inferredRecord.assetAppreciationDepreciation)) return false;

    if (inferredRecord.assetAppreciationDepreciation.assetId) {
      inferredRecord.assetAppreciationDepreciation.asset = await entityService.getAsset(inferredRecord.assetAppreciationDepreciation.assetId);
    }

    return true;
  }

  public async buildEntityMap() {
    const expenseAvenueList = (await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE)).docs as ExpenseAvenue[];
    const incomeSourceList = (await pouchdbService.listByCollection(Collection.INCOME_SOURCE)).docs as IncomeSource[];
    const partyList = (await pouchdbService.listByCollection(Collection.PARTY)).docs as Party[];
    const walletList = (await pouchdbService.listByCollection(Collection.WALLET)).docs as Wallet[];
    const assetList = (await pouchdbService.listByCollection(Collection.ASSET)).docs as Asset[];
    const currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
    const tagList = (await pouchdbService.listByCollection(Collection.TAG)).docs as Tag[];

    const map = new Map<string, ExpenseAvenue | IncomeSource | Party | Wallet | Asset | Currency | Tag>();
    expenseAvenueList.forEach((expenseAvenue) => map.set(expenseAvenue.$collection + "-" + expenseAvenue._id!, expenseAvenue));
    incomeSourceList.forEach((incomeSource) => map.set(incomeSource.$collection + "-" + incomeSource._id!, incomeSource));
    partyList.forEach((party) => map.set(party.$collection + "-" + party._id!, party));
    walletList.forEach((wallet) => map.set(wallet.$collection + "-" + wallet._id!, wallet));
    assetList.forEach((asset) => map.set(asset.$collection + "-" + asset._id!, asset));
    currencyList.forEach((currency) => map.set(currency.$collection + "-" + currency._id!, currency));
    tagList.forEach((tag) => map.set(tag.$collection + "-" + tag._id!, tag));

    return map;
  }

  public async inferInBatch(
    recordList: Record[],
    entityMap?: Map<string, ExpenseAvenue | IncomeSource | Party | Wallet | Asset | Currency | Tag>
  ): Promise<InferredRecord[]> {
    const inferredRecordList = deepClone(recordList) as InferredRecord[];

    const map = entityMap || (await this.buildEntityMap());

    for (const [index, inferredRecord] of inferredRecordList.entries()) {
      if (inferredRecord.type === RecordType.EXPENSE && inferredRecord.expense) {
        inferredRecord.expense.expenseAvenue = map.get(Collection.EXPENSE_AVENUE + "-" + inferredRecord.expense.expenseAvenueId) as ExpenseAvenue;
        if (inferredRecord.expense.expenseAvenue) {
          if (inferredRecord.expense.partyId) {
            inferredRecord.expense.party = map.get(Collection.PARTY + "-" + inferredRecord.expense.partyId) as Party;
          }
          if (inferredRecord.expense.walletId) {
            inferredRecord.expense.wallet = map.get(Collection.WALLET + "-" + inferredRecord.expense.walletId) as Wallet;
          }
        }
      } else if (inferredRecord.type === RecordType.INCOME && inferredRecord.income) {
        inferredRecord.income.incomeSource = map.get(Collection.INCOME_SOURCE + "-" + inferredRecord.income.incomeSourceId) as IncomeSource;
        if (inferredRecord.income.partyId) {
          inferredRecord.income.party = map.get(Collection.PARTY + "-" + inferredRecord.income.partyId) as Party;
        }
        if (inferredRecord.income.walletId) {
          inferredRecord.income.wallet = map.get(Collection.WALLET + "-" + inferredRecord.income.walletId) as Wallet;
        }
      } else if (inferredRecord.type === RecordType.MONEY_TRANSFER && inferredRecord.moneyTransfer) {
        if (inferredRecord.moneyTransfer.fromWalletId) {
          inferredRecord.moneyTransfer.fromWallet = map.get(Collection.WALLET + "-" + inferredRecord.moneyTransfer.fromWalletId) as Wallet;
        }
        if (inferredRecord.moneyTransfer.toWalletId) {
          inferredRecord.moneyTransfer.toWallet = map.get(Collection.WALLET + "-" + inferredRecord.moneyTransfer.toWalletId) as Wallet;
        }
      } else if (inferredRecord.type === RecordType.LENDING && inferredRecord.lending) {
        if (inferredRecord.lending.partyId) {
          inferredRecord.lending.party = map.get(Collection.PARTY + "-" + inferredRecord.lending.partyId) as Party;
        }
        if (inferredRecord.lending.walletId) {
          inferredRecord.lending.wallet = map.get(Collection.WALLET + "-" + inferredRecord.lending.walletId) as Wallet;
        }
      } else if (inferredRecord.type === RecordType.BORROWING && inferredRecord.borrowing) {
        if (inferredRecord.borrowing.partyId) {
          inferredRecord.borrowing.party = map.get(Collection.PARTY + "-" + inferredRecord.borrowing.partyId) as Party;
        }
        if (inferredRecord.borrowing.walletId) {
          inferredRecord.borrowing.wallet = map.get(Collection.WALLET + "-" + inferredRecord.borrowing.walletId) as Wallet;
        }
      } else if (inferredRecord.type === RecordType.REPAYMENT_GIVEN && inferredRecord.repaymentGiven) {
        if (inferredRecord.repaymentGiven.partyId) {
          inferredRecord.repaymentGiven.party = map.get(Collection.PARTY + "-" + inferredRecord.repaymentGiven.partyId) as Party;
        }
        if (inferredRecord.repaymentGiven.walletId) {
          inferredRecord.repaymentGiven.wallet = map.get(Collection.WALLET + "-" + inferredRecord.repaymentGiven.walletId) as Wallet;
        }
      } else if (inferredRecord.type === RecordType.REPAYMENT_RECEIVED && inferredRecord.repaymentReceived) {
        if (inferredRecord.repaymentReceived.partyId) {
          inferredRecord.repaymentReceived.party = map.get(Collection.PARTY + "-" + inferredRecord.repaymentReceived.partyId) as Party;
        }
        if (inferredRecord.repaymentReceived.walletId) {
          inferredRecord.repaymentReceived.wallet = map.get(Collection.WALLET + "-" + inferredRecord.repaymentReceived.walletId) as Wallet;
        }
      } else if (inferredRecord.type === RecordType.PAYABLE_PAYMENT && inferredRecord.payablePayment) {
        if (inferredRecord.payablePayment.partyId) {
          inferredRecord.payablePayment.party = map.get(Collection.PARTY + "-" + inferredRecord.payablePayment.partyId) as Party;
        }
        if (inferredRecord.payablePayment.walletId && inferredRecord.payablePayment.walletId !== "write-off") {
          inferredRecord.payablePayment.wallet = map.get(Collection.WALLET + "-" + inferredRecord.payablePayment.walletId) as Wallet;
        }
      } else if (inferredRecord.type === RecordType.RECEIVABLE_RECEIPT && inferredRecord.receivableReceipt) {
        if (inferredRecord.receivableReceipt.partyId) {
          inferredRecord.receivableReceipt.party = map.get(Collection.PARTY + "-" + inferredRecord.receivableReceipt.partyId) as Party;
        }
        if (inferredRecord.receivableReceipt.walletId && inferredRecord.receivableReceipt.walletId !== "write-off") {
          inferredRecord.receivableReceipt.wallet = map.get(Collection.WALLET + "-" + inferredRecord.receivableReceipt.walletId) as Wallet;
        }
      } else if (inferredRecord.type === RecordType.LOAN_FORGIVENESS_GIVEN && inferredRecord.loanForgivenessGiven) {
        if (inferredRecord.loanForgivenessGiven.partyId) {
          inferredRecord.loanForgivenessGiven.party = map.get(Collection.PARTY + "-" + inferredRecord.loanForgivenessGiven.partyId) as Party;
        }
      } else if (inferredRecord.type === RecordType.LOAN_FORGIVENESS_RECEIVED && inferredRecord.loanForgivenessReceived) {
        if (inferredRecord.loanForgivenessReceived.partyId) {
          inferredRecord.loanForgivenessReceived.party = map.get(Collection.PARTY + "-" + inferredRecord.loanForgivenessReceived.partyId) as Party;
        }
      } else if (inferredRecord.type === RecordType.ASSET_PURCHASE && inferredRecord.assetPurchase) {
        if (inferredRecord.assetPurchase.assetId) {
          inferredRecord.assetPurchase.asset = map.get(Collection.ASSET + "-" + inferredRecord.assetPurchase.assetId) as Asset;
        }
        if (inferredRecord.assetPurchase.partyId) {
          inferredRecord.assetPurchase.party = map.get(Collection.PARTY + "-" + inferredRecord.assetPurchase.partyId) as Party;
        }
        if (inferredRecord.assetPurchase.walletId) {
          inferredRecord.assetPurchase.wallet = map.get(Collection.WALLET + "-" + inferredRecord.assetPurchase.walletId) as Wallet;
        }
      } else if (inferredRecord.type === RecordType.ASSET_SALE && inferredRecord.assetSale) {
        if (inferredRecord.assetSale.assetId) {
          inferredRecord.assetSale.asset = map.get(Collection.ASSET + "-" + inferredRecord.assetSale.assetId) as Asset;
        }
        if (inferredRecord.assetSale.partyId) {
          inferredRecord.assetSale.party = map.get(Collection.PARTY + "-" + inferredRecord.assetSale.partyId) as Party;
        }
        if (inferredRecord.assetSale.walletId) {
          inferredRecord.assetSale.wallet = map.get(Collection.WALLET + "-" + inferredRecord.assetSale.walletId) as Wallet;
        }
      } else if (inferredRecord.type === RecordType.ASSET_APPRECIATION_DEPRECIATION && inferredRecord.assetAppreciationDepreciation) {
        if (inferredRecord.assetAppreciationDepreciation.assetId) {
          inferredRecord.assetAppreciationDepreciation.asset = map.get(Collection.ASSET + "-" + inferredRecord.assetAppreciationDepreciation.assetId) as Asset;
        }
      }

      inferredRecord.typePrettified = inferredRecord.type.replace(/\-/g, " ");
      inferredRecord.tagList = inferredRecord.tagIdList.map((tagId) => map.get(Collection.TAG + "-" + tagId) as Tag).filter(Boolean);
      if (index % 100 === 0) {
        await sleep(0);
      }
    }

    return inferredRecordList;
  }

  async applyRecordFilters(recordList: Record[], recordFilters: RecordFilters | null): Promise<Record[]> {
    if (!recordFilters) {
      return recordList;
    }

    const {
      recordTypeList,
      partyId,
      tagIdWhiteList,
      tagIdBlackList,
      currencyId,
      walletId,
      expenseAvenueId,
      incomeSourceId,
      assetId,
      searchString,
      deepSearchString,
    } = recordFilters;

    const [startEpoch, endEpoch] = normalizeEpochRange(recordFilters.startEpoch, recordFilters.endEpoch);

    if (recordTypeList.length) {
      recordList = recordList.filter((record) => recordTypeList.indexOf(record.type) > -1);
    }

    if (tagIdWhiteList.length) {
      recordList = recordList.filter((record) => {
        return record.tagIdList.some((tagId) => tagIdWhiteList.includes(tagId));
      });
    }

    if (tagIdBlackList.length > 0) {
      recordList = recordList.filter((record) => {
        return !record.tagIdList.some((tagId) => tagIdBlackList.includes(tagId));
      });
    }

    if (partyId) {
      recordList = recordList.filter(
        (record) =>
          record.income?.partyId === partyId ||
          record.expense?.partyId === partyId ||
          record.assetPurchase?.partyId === partyId ||
          record.assetSale?.partyId === partyId ||
          record.lending?.partyId === partyId ||
          record.borrowing?.partyId === partyId ||
          record.repaymentGiven?.partyId === partyId ||
          record.repaymentReceived?.partyId === partyId
      );
    }

    if (currencyId) {
      recordList = recordList.filter(
        (record) =>
          record.income?.currencyId === currencyId ||
          record.expense?.currencyId === currencyId ||
          record.assetPurchase?.currencyId === currencyId ||
          record.assetSale?.currencyId === currencyId ||
          record.assetAppreciationDepreciation?.currencyId === currencyId ||
          record.lending?.currencyId === currencyId ||
          record.borrowing?.currencyId === currencyId ||
          record.repaymentGiven?.currencyId === currencyId ||
          record.repaymentReceived?.currencyId === currencyId ||
          record.moneyTransfer?.fromCurrencyId === currencyId ||
          record.moneyTransfer?.toCurrencyId === currencyId
      );
    }

    if (walletId) {
      recordList = recordList.filter(
        (record) =>
          record.income?.walletId === walletId ||
          record.expense?.walletId === walletId ||
          record.assetPurchase?.walletId === walletId ||
          record.assetSale?.walletId === walletId ||
          record.lending?.walletId === walletId ||
          record.borrowing?.walletId === walletId ||
          record.repaymentGiven?.walletId === walletId ||
          record.repaymentReceived?.walletId === walletId ||
          record.moneyTransfer?.fromWalletId === walletId ||
          record.moneyTransfer?.toWalletId === walletId
      );
    }

    // We use a union (OR) of the filters here, rather than an intersection (AND),
    // because a single record can only be of one type: income, expense, or asset-related.
    // For example, a record cannot be both an expense and an income at the same time.
    // Therefore, we check if the record matches ANY of the provided filters.
    // This is only done for this special case. Other filters are ANDed.
    if (expenseAvenueId || incomeSourceId || assetId) {
      recordList = recordList.filter((record) => {
        if (expenseAvenueId && record.expense?.expenseAvenueId === expenseAvenueId) return true;
        if (incomeSourceId && record.income?.incomeSourceId === incomeSourceId) return true;
        if (
          assetId &&
          (record.assetPurchase?.assetId === assetId || record.assetSale?.assetId === assetId || record.assetAppreciationDepreciation?.assetId === assetId)
        )
          return true;
        return false;
      });
    }

    if (searchString && searchString.length > 0) {
      recordList = recordList.filter((record) => record.notes && String(record.notes).toLocaleLowerCase().indexOf(searchString.toLocaleLowerCase()) > -1);
    }

    if (deepSearchString && deepSearchString.length > 0) {
      recordList = recordList.filter((record) => JSON.stringify(record).toLocaleLowerCase().indexOf(deepSearchString.toLocaleLowerCase()) > -1);
    }

    recordList = recordList.filter((record) => record.transactionEpoch >= startEpoch && record.transactionEpoch <= endEpoch);

    if (recordFilters.type === "budget" && recordFilters._budgetName === UNBUDGETED_RECORDS_BUDGET_NAME) {
      recordList = await this.filterUnbudgetedRecords(recordList);
    }

    return recordList;
  }

  private async filterUnbudgetedRecords(recordList: Record[]) {
    const rollingBudgetList = await rollingBudgetService.listAll();

    for (const rollingBudget of rollingBudgetList) {
      // Check each period of the rolling budget
      for (let periodIndex = 0; periodIndex < rollingBudget.budgetedPeriodList.length; periodIndex++) {
        const recordFilters = rollingBudgetService.createRecordFiltersForRollingBudget(rollingBudget, periodIndex);
        const filteredRecordList = await this.applyRecordFilters(recordList, recordFilters);
        recordList = recordList.filter((record) => !filteredRecordList.includes(record));
      }
    }

    return recordList;
  }
}

export const recordService = new RecordService();
