import { z } from "zod";
import { BaseDocumentSchema } from "./base";
import { Collection } from "src/constants/constants";

/**
 * Tag schema
 */
export const TagSchema = BaseDocumentSchema.extend({
  $collection: z.literal(Collection.TAG),
  name: z.string().min(1, "Tag name is required"),
  color: z.string().min(1, "Tag color is required"),
});

/**
 * Tag type inferred from Zod schema
 */
export type Tag = z.infer<typeof TagSchema>;
