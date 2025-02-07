import { Collection } from "src/constants/constants";
import { pouchdbService } from "./pouchdb-service";
import { RollingBudget } from "src/models/rolling-budget";
import { computationService } from "./computation-service";
import { deepClone } from "src/utils/misc-utils";

class RollingBudgetService {
  public async listAllFeaturedInRange(startEpoch: number, endEpoch: number): Promise<RollingBudget[]> {
    let list = (await pouchdbService.listByCollection(Collection.ROLLING_BUDGET)).docs as RollingBudget[];
    list = list.filter((doc) => doc.isFeatured);
    list.forEach((doc) => {
      doc._budgetedPeriodIndexInRange = -1;
      doc._budgetedPeriodIndexInRange = doc.budgetedPeriodList.findIndex((period) => period.startEpoch >= startEpoch && period.endEpoch <= endEpoch);
    });
    list = list.filter((doc) => doc._budgetedPeriodIndexInRange !== -1);
    await Promise.all(list.map(computationService.computeUsedAmountForRollingBudgetInPlace));
    return list;
  }
}

export const rollingBudgetService = new RollingBudgetService();
