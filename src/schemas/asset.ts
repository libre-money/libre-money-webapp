import { z } from "zod";
import { BaseDocumentSchema } from "./base";
import { Collection } from "src/constants/constants";

/**
 * Asset schema
 */
export const AssetSchema = BaseDocumentSchema.extend({
  $collection: z.literal(Collection.ASSET),
  name: z.string().min(1, "Asset name is required"),
  type: z.string(),
  liquidity: z.string(),
  initialBalance: z.coerce.number(),
  currencyId: z.string().min(1, "Currency ID is required"),
  _currencySign: z.string().optional(),
  _balance: z.number().optional(),
});

/**
 * Asset type inferred from Zod schema
 */
export type Asset = z.infer<typeof AssetSchema>;
