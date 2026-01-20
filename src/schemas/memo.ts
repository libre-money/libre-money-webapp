import { z } from "zod";
import { BaseDocumentSchema } from "./base";
import { Collection } from "src/constants/constants";

/**
 * Memo schema
 */
export const MemoSchema = BaseDocumentSchema.extend({
  $collection: z.literal(Collection.MEMO),
  name: z.string().min(1, "Memo name is required"),
  content: z.string(),
  modifiedEpoch: z.number().optional(),
});

/**
 * Memo type inferred from Zod schema
 */
export type Memo = z.infer<typeof MemoSchema>;
