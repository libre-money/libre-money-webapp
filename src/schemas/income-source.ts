import { z } from "zod";
import { BaseDocumentSchema } from "./base";
import { Collection } from "src/constants/constants";

/**
 * IncomeSource schema
 */
export const IncomeSourceSchema = BaseDocumentSchema.extend({
  $collection: z.literal(Collection.INCOME_SOURCE),
  name: z.string().min(1, "Income source name is required"),
  fixtureCode: z.string().optional(),
  dissuadeEditing: z.boolean().optional(),
  denyDeletion: z.boolean().optional(),
});

/**
 * IncomeSource type inferred from Zod schema
 */
export type IncomeSource = z.infer<typeof IncomeSourceSchema>;
