import { InferredRecord } from "src/models/inferred/inferred-record";

export interface DuplicateGroup {
  records: InferredRecord[];
  duplicateIds: Set<string>;
}

class DuplicateFinderService {
  /**
   * Finds potentially duplicate records based on:
   * 1. Same record type
   * 2. Transaction epoch within 3 days
   * 3. Same amount
   * Wallet can be same or different - doesn't matter
   */
  findPotentialDuplicates(records: InferredRecord[]): Set<string> {
    const duplicateIds = new Set<string>();
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

    // Group records by type and amount
    const recordGroups = new Map<string, InferredRecord[]>();

    for (const record of records) {
      const amount = this.getRecordAmount(record);
      if (amount === null || record.type === undefined) continue;

      const key = `${record.type!}_${amount}`;
      if (!recordGroups.has(key)) {
        recordGroups.set(key, []);
      }
      recordGroups.get(key)!.push(record);
    }

    // Check for duplicates within each group
    for (const group of recordGroups.values()) {
      if (group.length < 2) continue;

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const record1 = group[i];
          const record2 = group[j];

          const timeDiff = Math.abs(record1.transactionEpoch - record2.transactionEpoch);
          if (timeDiff <= threeDaysInMs && record1._id && record2._id) {
            duplicateIds.add(record1._id);
            duplicateIds.add(record2._id);
          }
        }
      }
    }

    return duplicateIds;
  }

  private getRecordAmount(record: InferredRecord): number | null {
    switch (record.type) {
      case "expense":
        return record.expense?.amount ?? null;
      case "income":
        return record.income?.amount ?? null;
      case "borrowing":
        return record.borrowing?.amount ?? null;
      case "lending":
        return record.lending?.amount ?? null;
      case "repayment-given":
        return record.repaymentGiven?.amount ?? null;
      case "repayment-received":
        return record.repaymentReceived?.amount ?? null;
      case "asset-purchase":
        return record.assetPurchase?.amount ?? null;
      case "asset-sale":
        return record.assetSale?.amount ?? null;
      case "asset-appreciation-depreciation":
        return record.assetAppreciationDepreciation?.amount ?? null;
      case "money-transfer":
        // For money transfers, we'll use the 'from' amount as the comparison amount
        return record.moneyTransfer?.fromAmount ?? null;
      default:
        return null;
    }
  }
}

export const duplicateFinderService = new DuplicateFinderService();
