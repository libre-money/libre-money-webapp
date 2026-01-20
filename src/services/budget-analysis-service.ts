import { Collection } from "src/constants/constants";
import { Asset } from "src/schemas/asset";
import { Currency } from "src/schemas/currency";
import { ExpenseAvenue } from "src/schemas/expense-avenue";
import { Record } from "src/schemas/record";
import { BudgetedPeriod, RollingBudget } from "src/schemas/rolling-budget";
import { asAmount } from "src/utils/de-facto-utils";
import { entityService } from "./entity-service";
import { pouchdbService } from "./pouchdb-service";
import { recordService } from "./record-service";
import { rollingBudgetService } from "./rolling-budget-service";
import { computationService } from "./computation-service";

export type BudgetAnalysisItem = {
  id: string;
  name: string;
  type: "Expense" | "Asset";
  currency: Currency;
  periods: {
    period: BudgetedPeriod;
    amount: number;
    count: number;
  }[];
  totalAmount: number;
  totalCount: number;
};

export type BudgetAnalysisResult = {
  budget: RollingBudget;
  currency: Currency;
  items: BudgetAnalysisItem[];
  periods: BudgetedPeriod[];
  periodTotals: {
    period: BudgetedPeriod;
    totalAmount: number;
    totalCount: number;
    totalAllocatedAmount: number;
  }[];
  grandTotal: {
    totalAmount: number;
    totalCount: number;
  };
};

class BudgetAnalysisService {
  async computeBudgetAnalysis(budget: RollingBudget): Promise<BudgetAnalysisResult> {
    const currency = await entityService.getCurrency(budget.currencyId);
    if (!currency) {
      throw new Error(`Currency not found: ${budget.currencyId}`);
    }

    await computationService.computeUsedAmountForRollingBudgetInPlace(budget);

    // Get all periods that have records
    const periods = budget.budgetedPeriodList.filter((period) => period.usedAmount > 0 || period.allocatedAmount > 0);

    if (periods.length === 0) {
      return {
        budget,
        currency,
        items: [],
        periods: [],
        periodTotals: [],
        grandTotal: {
          totalAmount: 0,
          totalCount: 0,
        },
      };
    }

    // Get all records first
    const allRecords = (await pouchdbService.listByCollection(Collection.RECORD)).docs as Record[];
    const expenseAvenueMap = new Map<string, ExpenseAvenue>();
    const assetMap = new Map<string, Asset>();

    // Pre-load entities from all records
    for (const record of allRecords) {
      if (record.expense?.expenseAvenueId) {
        const expenseAvenue = await entityService.getExpenseAvenue(record.expense.expenseAvenueId);
        if (expenseAvenue) {
          expenseAvenueMap.set(record.expense.expenseAvenueId, expenseAvenue);
        }
      }
      if (record.assetPurchase?.assetId) {
        const asset = await entityService.getAsset(record.assetPurchase.assetId);
        if (asset) {
          assetMap.set(record.assetPurchase.assetId, asset);
        }
      }
    }

    // Group records by entity and period
    const itemMap = new Map<string, BudgetAnalysisItem>();

    for (const period of periods) {
      const recordFilters = rollingBudgetService.createRecordFiltersForRollingBudget(budget, budget.budgetedPeriodList.indexOf(period));
      const records = await recordService.applyRecordFilters(allRecords, recordFilters);

      // Process expenses
      for (const record of records) {
        if (record.expense && record.expense.currencyId === currency._id) {
          const expenseAvenueId = record.expense.expenseAvenueId;
          const expenseAvenue = expenseAvenueMap.get(expenseAvenueId);
          if (!expenseAvenue) continue;

          const key = `expense_${expenseAvenueId}`;
          const amount = asAmount(record.expense.amountPaid);

          if (!itemMap.has(key)) {
            itemMap.set(key, {
              id: expenseAvenueId,
              name: expenseAvenue.name,
              type: "Expense",
              currency,
              periods: periods.map((p) => ({ period: p, amount: 0, count: 0 })),
              totalAmount: 0,
              totalCount: 0,
            });
          }

          const item = itemMap.get(key)!;
          const periodIndex = periods.findIndex((p) => p.startEpoch === period.startEpoch && p.endEpoch === period.endEpoch);
          if (periodIndex !== -1) {
            item.periods[periodIndex].amount += amount;
            item.periods[periodIndex].count += 1;
            item.totalAmount += amount;
            item.totalCount += 1;
          }
        }
      }

      // Process asset purchases
      for (const record of records) {
        if (record.assetPurchase && record.assetPurchase.currencyId === currency._id) {
          const assetId = record.assetPurchase.assetId;
          const asset = assetMap.get(assetId);
          if (!asset) continue;

          const key = `asset_${assetId}`;
          const amount = asAmount(record.assetPurchase.amountPaid);

          if (!itemMap.has(key)) {
            itemMap.set(key, {
              id: assetId,
              name: asset.name,
              type: "Asset",
              currency,
              periods: periods.map((p) => ({ period: p, amount: 0, count: 0 })),
              totalAmount: 0,
              totalCount: 0,
            });
          }

          const item = itemMap.get(key)!;
          const periodIndex = periods.findIndex((p) => p.startEpoch === period.startEpoch && p.endEpoch === period.endEpoch);
          if (periodIndex !== -1) {
            item.periods[periodIndex].amount += amount;
            item.periods[periodIndex].count += 1;
            item.totalAmount += amount;
            item.totalCount += 1;
          }
        }
      }
    }

    // Convert to array and sort by type (Expenses first), then by total amount
    const items = Array.from(itemMap.values()).sort((a, b) => {
      // Sort by type: "Expense" first, then "Asset", then others
      const typeOrder = (type: string) => {
        if (type === "Expense") return 0;
        if (type === "Asset") return 1;
        return 2;
      };
      const typeDiff = typeOrder(a.type) - typeOrder(b.type);
      if (typeDiff !== 0) return typeDiff;
      // If same type, sort by total amount descending
      return b.totalAmount - a.totalAmount;
    });

    // Compute period totals
    const periodTotals = periods.map((period) => {
      const totalAmount = items.reduce((sum, item) => {
        const periodData = item.periods.find((p) => p.period.startEpoch === period.startEpoch && p.period.endEpoch === period.endEpoch);
        return sum + (periodData?.amount || 0);
      }, 0);

      const totalCount = items.reduce((sum, item) => {
        const periodData = item.periods.find((p) => p.period.startEpoch === period.startEpoch && p.period.endEpoch === period.endEpoch);
        return sum + (periodData?.count || 0);
      }, 0);

      return {
        period,
        totalAmount,
        totalCount,
        totalAllocatedAmount: period.totalAllocatedAmount,
      };
    });

    // Compute grand total
    const grandTotal = {
      totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0),
      totalCount: items.reduce((sum, item) => sum + item.totalCount, 0),
    };

    return {
      budget,
      currency,
      items,
      periods,
      periodTotals,
      grandTotal,
    };
  }

  async getBudgetsWithAnalysis(): Promise<RollingBudget[]> {
    const budgets = await rollingBudgetService.listAll();
    return budgets.filter((budget) => budget.budgetedPeriodList.length > 0);
  }
}

export const budgetAnalysisService = new BudgetAnalysisService();
