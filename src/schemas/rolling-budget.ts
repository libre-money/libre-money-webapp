import { z } from "zod";
import { BaseDocumentSchema } from "./base";
import { Collection } from "src/constants/constants";

/**
 * BudgetedPeriod schema
 */
const BudgetedPeriodSchema = z.object({
  startEpoch: z.number().int(),
  endEpoch: z.number().int(),
  title: z.string(),
  allocatedAmount: z.coerce.number(),
  rolledOverAmount: z.coerce.number(),
  totalAllocatedAmount: z.coerce.number(),
  heldAmount: z.coerce.number(),
  usedAmount: z.coerce.number(),
  remainingAmount: z.coerce.number(),
  calculatedEpoch: z.number().int(),
});

/**
 * RollingBudget schema
 */
export const RollingBudgetSchema = BaseDocumentSchema.extend({
  $collection: z.literal(Collection.ROLLING_BUDGET),
  name: z.string().min(1, "Budget name is required"),
  includeExpenses: z.boolean(),
  includeAssetPurchases: z.boolean(),
  tagIdWhiteList: z.array(z.string()),
  tagIdBlackList: z.array(z.string()),
  frequency: z.enum(["monthly", "irregular"]),
  budgetedPeriodList: z.array(BudgetedPeriodSchema),
  rollOverRule: z.enum(["always", "never", "positive-only", "negative-only"]),
  isFeatured: z.boolean(),
  currencyId: z.string().min(1, "Currency ID is required"),
  _currencySign: z.string().optional(),
  _budgetedPeriodIndexInRange: z.number().int().optional(),
  monthlyStartDate: z.number().int().nullable().optional(),
  monthlyEndDate: z.number().int().nullable().optional(),
});

/**
 * RollingBudget type inferred from Zod schema
 */
export type RollingBudget = z.infer<typeof RollingBudgetSchema>;

/**
 * BudgetedPeriod type inferred from Zod schema
 */
export type BudgetedPeriod = z.infer<typeof BudgetedPeriodSchema>;
