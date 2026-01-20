import { z } from "zod";
import { BaseDocumentSchema } from "./base";
import { Collection } from "src/constants/constants";

/**
 * ExpenseAvenue schema
 */
export const ExpenseAvenueSchema = BaseDocumentSchema.extend({
  $collection: z.literal(Collection.EXPENSE_AVENUE),
  name: z.string().min(1, "Expense avenue name is required"),
  fixtureCode: z.string().optional(),
  dissuadeEditing: z.boolean().optional(),
  denyDeletion: z.boolean().optional(),
});

/**
 * ExpenseAvenue type inferred from Zod schema
 */
export type ExpenseAvenue = z.infer<typeof ExpenseAvenueSchema>;
