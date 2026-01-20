import { z } from "zod";
import { BaseDocumentSchema } from "./base";
import { Collection } from "src/constants/constants";

/**
 * Party schema
 */
export const PartySchema = BaseDocumentSchema.extend({
  $collection: z.literal(Collection.PARTY),
  name: z.string().min(1, "Party name is required"),
  type: z.string(),
});

/**
 * Party type inferred from Zod schema
 */
export type Party = z.infer<typeof PartySchema>;
