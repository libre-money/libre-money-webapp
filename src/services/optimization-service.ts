import { Notify } from "quasar";
import { Router } from "vue-router";
import { Collection } from "src/constants/constants";
import { Currency } from "src/schemas/currency";
import { migrationService } from "src/services/migration-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { useUserStore } from "src/stores/user";
import { parseNumber } from "src/utils/number-utils";
import { syncService } from "./sync-service";

const userStore = useUserStore();

export type OptimizationStage =
  | "Validating user"
  | "Ensuring default currency"
  | "Running migrations"
  | "Scanning documents"
  | "Normalizing documents"
  | "Completed";

export type OptimizationProgress = {
  stage: OptimizationStage;
  processedDocs: number;
  totalDocs: number;
  updatedDocs: number;
};

export type OptimizationSummary = {
  updatedDocs: number;
  totalDocs: number;
  durationMs: number;
};

type ProgressCallback = (progress: OptimizationProgress) => void;

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  try {
    const n = parseNumber(value as any);
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

function asRequiredAmount(value: unknown): number {
  if (value === null || value === undefined) return 0;
  try {
    const n = parseNumber(value as any);
    if (!Number.isFinite(n)) return 0;
    return n;
  } catch {
    return 0;
  }
}

function asRequiredEpoch(value: unknown): number {
  if (value === null || value === undefined) return 0;
  try {
    const n = parseNumber(value as any);
    if (!Number.isFinite(n)) return 0;
    return Math.trunc(n);
  } catch {
    return 0;
  }
}

function asInteger(value: unknown): number | undefined {
  const n = asNumber(value);
  if (n === undefined) return undefined;
  return Math.trunc(n);
}

class OptimizationService {
  async optimizeDatabase(router: Router, onProgress?: ProgressCallback): Promise<OptimizationSummary | null> {
    const startedAt = Date.now();
    const progress: OptimizationProgress = { stage: "Validating user", processedDocs: 0, totalDocs: 0, updatedDocs: 0 };
    onProgress?.(progress);

    const currentUser = userStore.currentUser;
    if (!currentUser) {
      Notify.create({ type: "negative", message: "You must be logged in to optimize the database." });
      await router.push({ name: "login" });
      return null;
    }

    const isOfflineOrDemoUser = !!(currentUser.isOfflineUser || currentUser.isDemoUser);
    const hasCompletedInitialSync = currentUser.isInitialSyncComplete === true;

    if (!isOfflineOrDemoUser && !hasCompletedInitialSync) {
      Notify.create({ type: "negative", message: "Please complete the initial sync before optimizing the database." });
      await router.push({ name: "overview" });
      return null;
    }

    try {
      syncService.setBackgroundSyncEnabled(false);

      // Ensure at least one currency exists (default: USD)
      progress.stage = "Ensuring default currency";
      onProgress?.(progress);
      const currencyRes = (await pouchdbService.listByCollection(Collection.CURRENCY)) as { docs: Currency[]; };
      if (!currencyRes.docs || currencyRes.docs.length === 0) {
        const defaultCurrency: Currency = {
          $collection: Collection.CURRENCY,
          name: "US Dollar",
          sign: "USD",
          precisionMinimum: 2,
          precisionMaximum: 2,
        };
        await pouchdbService.upsertDoc(defaultCurrency);
      }

      progress.stage = "Running migrations";
      onProgress?.(progress);
      await migrationService.migrateDefaultExpenseAvenueAndIncomeSource();

      const { updatedDocs, totalDocs } = await this.normalizeAllDocTypes((p) => {
        progress.stage = p.stage;
        progress.processedDocs = p.processedDocs;
        progress.totalDocs = p.totalDocs;
        progress.updatedDocs = p.updatedDocs;
        onProgress?.(progress);
      });

      progress.stage = "Completed";
      onProgress?.(progress);

      return { updatedDocs, totalDocs, durationMs: Date.now() - startedAt };
    } catch (error) {
      console.error("Error optimizing database:", error);
      Notify.create({ type: "negative", message: "Error optimizing database: " + (error instanceof Error ? error.message : String(error)) });
      return null;
    } finally {
      progress.stage = "Completed";
      onProgress?.(progress);
      syncService.setBackgroundSyncEnabled(true);
    }
  }

  private async normalizeAllDocTypes(onProgress?: ProgressCallback): Promise<{ updatedDocs: number; totalDocs: number; }> {
    const res = await pouchdbService.listDocs();
    const docs = (res?.rows || []).map((r: any) => r?.doc).filter(Boolean);
    const totalDocs = docs.length;

    let updatedDocs = 0;
    let processedDocs = 0;
    const emit = (stage: OptimizationStage) => {
      onProgress?.({ stage, processedDocs, totalDocs, updatedDocs });
    };

    emit("Scanning documents");
    for (const doc of docs) {
      processedDocs += 1;
      if (!doc || typeof doc !== "object") continue;
      if (typeof doc.$collection !== "string" || doc.$collection.trim().length === 0) continue;

      // Update UI at a reasonable cadence even if no docs are updated
      if (processedDocs === 1 || processedDocs % 50 === 0 || processedDocs === totalDocs) {
        emit("Normalizing documents");
      }

      const { normalizedDoc, changed } = this.normalizeDocByCollection(doc);
      if (!changed) continue;

      // Important: preserve _id/_rev so upsert becomes a put()
      await pouchdbService.upsertDoc(normalizedDoc);
      updatedDocs += 1;

      // Emit after updates too so the "updated docs" count feels responsive
      if (updatedDocs === 1 || updatedDocs % 10 === 0) {
        emit("Normalizing documents");
      }
    }

    emit("Normalizing documents");
    return { updatedDocs, totalDocs };
  }

  private normalizeDocByCollection(doc: any): { normalizedDoc: any; changed: boolean; } {
    switch (doc.$collection) {
      case Collection.CURRENCY:
        return this.normalizeCurrencyDoc(doc);
      case Collection.WALLET:
        return this.normalizeWalletDoc(doc);
      case Collection.ASSET:
        return this.normalizeAssetDoc(doc);
      case Collection.RECORD:
      case Collection.RECORD_TEMPLATE:
        return this.normalizeRecordDoc(doc);
      case Collection.ROLLING_BUDGET:
        return this.normalizeRollingBudgetDoc(doc);
      case Collection.MEMO:
        return this.normalizeMemoDoc(doc);
      case Collection.TEXT_IMPORT_RULES:
        return this.normalizeTextImportRulesDoc(doc);
      case Collection.PARTY:
        return this.normalizePartyDoc(doc);
      case Collection.TAG:
        return this.normalizeTagDoc(doc);
      case Collection.INCOME_SOURCE:
        return this.normalizeIncomeSourceDoc(doc);
      case Collection.EXPENSE_AVENUE:
        return this.normalizeExpenseAvenueDoc(doc);
      default:
        return { normalizedDoc: doc, changed: false };
    }
  }

  // --- Dedicated per-type normalizers (only touch known numeric fields)

  private normalizeCurrencyDoc(doc: any): { normalizedDoc: any; changed: boolean; } {
    let changed = false;
    const precisionMinimum = asInteger(doc.precisionMinimum);
    if (precisionMinimum !== undefined && doc.precisionMinimum !== precisionMinimum) {
      doc.precisionMinimum = precisionMinimum;
      changed = true;
    }
    const precisionMaximum = asInteger(doc.precisionMaximum);
    if (precisionMaximum !== undefined && doc.precisionMaximum !== precisionMaximum) {
      doc.precisionMaximum = precisionMaximum;
      changed = true;
    }
    return { normalizedDoc: doc, changed };
  }

  private normalizeWalletDoc(doc: any): { normalizedDoc: any; changed: boolean; } {
    let changed = false;
    const initialBalance = asRequiredAmount(doc.initialBalance);
    if (doc.initialBalance !== initialBalance) {
      doc.initialBalance = initialBalance;
      changed = true;
    }
    const minimumBalance = asRequiredAmount(doc.minimumBalance);
    if (doc.minimumBalance !== minimumBalance) {
      doc.minimumBalance = minimumBalance;
      changed = true;
    }
    const modifiedEpoch = asRequiredEpoch(doc.modifiedEpoch);
    if (doc.modifiedEpoch !== modifiedEpoch) {
      doc.modifiedEpoch = modifiedEpoch;
      changed = true;
    }
    return { normalizedDoc: doc, changed };
  }

  private normalizeAssetDoc(doc: any): { normalizedDoc: any; changed: boolean; } {
    let changed = false;
    const initialBalance = asRequiredAmount(doc.initialBalance);
    if (doc.initialBalance !== initialBalance) {
      doc.initialBalance = initialBalance;
      changed = true;
    }
    const modifiedEpoch = asRequiredEpoch(doc.modifiedEpoch);
    if (doc.modifiedEpoch !== modifiedEpoch) {
      doc.modifiedEpoch = modifiedEpoch;
      changed = true;
    }
    return { normalizedDoc: doc, changed };
  }

  private normalizeRecordDoc(doc: any): { normalizedDoc: any; changed: boolean; } {
    let changed = false;

    const transactionEpoch = asRequiredEpoch(doc.transactionEpoch);
    if (doc.transactionEpoch !== transactionEpoch) {
      doc.transactionEpoch = transactionEpoch;
      changed = true;
    }
    const modifiedEpoch = asRequiredEpoch(doc.modifiedEpoch);
    if (doc.modifiedEpoch !== modifiedEpoch) {
      doc.modifiedEpoch = modifiedEpoch;
      changed = true;
    }

    const normalizeAmountFields = (obj: any, keys: string[]) => {
      if (!obj || typeof obj !== "object") return;
      for (const key of keys) {
        const n = asRequiredAmount(obj[key]);
        if (obj[key] !== n) {
          obj[key] = n;
          changed = true;
        }
      }
    };

    normalizeAmountFields(doc.expense, ["amount", "amountPaid", "amountUnpaid"]);
    normalizeAmountFields(doc.income, ["amount", "amountPaid", "amountUnpaid"]);
    normalizeAmountFields(doc.assetPurchase, ["amount", "amountPaid", "amountUnpaid"]);
    normalizeAmountFields(doc.assetSale, ["amount", "amountPaid", "amountUnpaid"]);
    normalizeAmountFields(doc.assetAppreciationDepreciation, ["amount"]);
    normalizeAmountFields(doc.lending, ["amount"]);
    normalizeAmountFields(doc.borrowing, ["amount"]);
    normalizeAmountFields(doc.repaymentGiven, ["amount"]);
    normalizeAmountFields(doc.repaymentReceived, ["amount"]);
    normalizeAmountFields(doc.moneyTransfer, ["fromAmount", "toAmount"]);

    return { normalizedDoc: doc, changed };
  }

  private normalizeRollingBudgetDoc(doc: any): { normalizedDoc: any; changed: boolean; } {
    let changed = false;

    const normalizeBudgetedPeriod = (p: any) => {
      if (!p || typeof p !== "object") return;
      const intKeys = ["startEpoch", "endEpoch", "calculatedEpoch"];
      for (const k of intKeys) {
        const n = asRequiredEpoch(p[k]);
        if (p[k] !== n) {
          p[k] = n;
          changed = true;
        }
      }
      const numKeys = ["allocatedAmount", "rolledOverAmount", "totalAllocatedAmount", "heldAmount", "usedAmount", "remainingAmount"];
      for (const k of numKeys) {
        const n = asRequiredAmount(p[k]);
        if (p[k] !== n) {
          p[k] = n;
          changed = true;
        }
      }
    };

    if (Array.isArray(doc.budgetedPeriodList)) {
      doc.budgetedPeriodList.forEach(normalizeBudgetedPeriod);
    }

    const monthlyStartDate = asInteger(doc.monthlyStartDate);
    if (monthlyStartDate !== undefined && doc.monthlyStartDate !== monthlyStartDate) {
      doc.monthlyStartDate = monthlyStartDate;
      changed = true;
    }
    const monthlyEndDate = asInteger(doc.monthlyEndDate);
    if (monthlyEndDate !== undefined && doc.monthlyEndDate !== monthlyEndDate) {
      doc.monthlyEndDate = monthlyEndDate;
      changed = true;
    }

    const modifiedEpoch = asRequiredEpoch(doc.modifiedEpoch);
    if (doc.modifiedEpoch !== modifiedEpoch) {
      doc.modifiedEpoch = modifiedEpoch;
      changed = true;
    }

    return { normalizedDoc: doc, changed };
  }

  private normalizeMemoDoc(doc: any): { normalizedDoc: any; changed: boolean; } {
    let changed = false;
    const modifiedEpoch = asRequiredEpoch(doc.modifiedEpoch);
    if (doc.modifiedEpoch !== modifiedEpoch) {
      doc.modifiedEpoch = modifiedEpoch;
      changed = true;
    }
    return { normalizedDoc: doc, changed };
  }

  private normalizeTextImportRulesDoc(doc: any): { normalizedDoc: any; changed: boolean; } {
    let changed = false;
    const intKeys = ["walletCaptureGroup", "expenseAvenueCaptureGroup", "dateCaptureGroup", "amountCaptureGroup"];
    for (const k of intKeys) {
      const n = asInteger(doc[k]);
      if (n !== undefined && doc[k] !== n) {
        doc[k] = n;
        changed = true;
      }
    }
    const modifiedEpoch = asRequiredEpoch(doc.modifiedEpoch);
    if (doc.modifiedEpoch !== modifiedEpoch) {
      doc.modifiedEpoch = modifiedEpoch;
      changed = true;
    }
    return { normalizedDoc: doc, changed };
  }

  private normalizePartyDoc(doc: any): { normalizedDoc: any; changed: boolean; } {
    // currently no numeric fields
    return { normalizedDoc: doc, changed: false };
  }

  private normalizeTagDoc(doc: any): { normalizedDoc: any; changed: boolean; } {
    // currently no numeric fields
    return { normalizedDoc: doc, changed: false };
  }

  private normalizeIncomeSourceDoc(doc: any): { normalizedDoc: any; changed: boolean; } {
    // currently no numeric fields
    return { normalizedDoc: doc, changed: false };
  }

  private normalizeExpenseAvenueDoc(doc: any): { normalizedDoc: any; changed: boolean; } {
    // currently no numeric fields
    return { normalizedDoc: doc, changed: false };
  }
}

export const optimizationService = new OptimizationService();

