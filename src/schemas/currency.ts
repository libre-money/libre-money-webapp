import { z } from "zod";
import { BaseDocumentSchema } from "./base";
import { Collection } from "src/constants/constants";

/**
 * Currency schema
 */
export const CurrencySchema = BaseDocumentSchema.extend({
  $collection: z.literal(Collection.CURRENCY),
  name: z.string().min(1, "Currency name is required"),
  sign: z.string().min(1, "Currency sign is required"),
  precisionMinimum: z.number().optional(),
  precisionMaximum: z.number().optional(),
});

/**
 * Currency type inferred from Zod schema
 */
export type Currency = z.infer<typeof CurrencySchema>;
