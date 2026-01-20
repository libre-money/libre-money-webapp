import { Collection, RecordType } from "src/constants/constants";
import { pouchdbService } from "./pouchdb-service";
import { RollingBudget } from "src/schemas/rolling-budget";
import { computationService } from "./computation-service";
import { deepClone } from "src/utils/misc-utils";
import { RecordFilters } from "src/models/inferred/record-filters";
import { normalizeEpochRange } from "src/utils/date-utils";

class RollingBudgetService {
  public async listAll(): Promise<RollingBudget[]> {
    return (await pouchdbService.listByCollection(Collection.ROLLING_BUDGET)).docs as RollingBudget[];
  }

  public async listAllBudgetsInRange(startEpoch: number, endEpoch: number): Promise<RollingBudget[]> {
    [startEpoch, endEpoch] = normalizeEpochRange(startEpoch, endEpoch);
    let list = (await pouchdbService.listByCollection(Collection.ROLLING_BUDGET)).docs as RollingBudget[];
    list.forEach((doc) => {
      doc._budgetedPeriodIndexInRange = -1;
      doc._budgetedPeriodIndexInRange = doc.budgetedPeriodList.findIndex((period) => {
        const [periodStart, periodEnd] = normalizeEpochRange(period.startEpoch, period.endEpoch);
        return periodStart >= startEpoch && periodEnd <= endEpoch;
      });
    });
    list = list.filter((doc) => doc._budgetedPeriodIndexInRange !== -1);
    list = list.sort((a, b) => a.name.localeCompare(b.name));
    await Promise.all(list.map(computationService.computeUsedAmountForRollingBudgetInPlace));
    return list;
  }

  public createRecordFiltersForRollingBudget(rollingBudget: RollingBudget, budgetedPeriodIndex?: number): RecordFilters {
    // Use the current period or the specified period
    let periodIndex = budgetedPeriodIndex !== undefined ? budgetedPeriodIndex : -1;

    if (periodIndex === -1) {
      periodIndex = rollingBudget.budgetedPeriodList.findIndex((period) => period.startEpoch <= Date.now() && period.endEpoch >= Date.now());
    }

    if (periodIndex === -1) {
      periodIndex = rollingBudget.budgetedPeriodList.length - 1;
    }

    const period = rollingBudget.budgetedPeriodList[periodIndex >= 0 ? periodIndex : 0];

    const recordTypeList: string[] = [];
    if (rollingBudget.includeExpenses) {
      recordTypeList.push(RecordType.EXPENSE);
    }
    if (rollingBudget.includeAssetPurchases) {
      recordTypeList.push(RecordType.ASSET_PURCHASE);
    }

    const recordFilter: RecordFilters = {
      startEpoch: period.startEpoch,
      endEpoch: period.endEpoch,
      recordTypeList,
      tagIdWhiteList: rollingBudget.tagIdWhiteList,
      tagIdBlackList: rollingBudget.tagIdBlackList,
      partyId: null,
      currencyId: rollingBudget.currencyId,
      walletId: null,
      expenseAvenueId: null,
      incomeSourceId: null,
      assetId: null,
      searchString: "",
      deepSearchString: "",
      sortBy: "transactionEpochDesc",
      type: "budget",
      _budgetName: rollingBudget.name,
      _preset: "custom",
    };

    return recordFilter;
  }
}

export const rollingBudgetService = new RollingBudgetService();
