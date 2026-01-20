import { z } from "zod";
import { BaseDocumentSchema } from "./base";
import { Collection } from "src/constants/constants";

/**
 * Wallet schema with type coercion for numeric fields
 */
export const WalletSchema = BaseDocumentSchema.extend({
  $collection: z.literal(Collection.WALLET),
  name: z.string().min(1, "Wallet name is required"),
  type: z.string(),
  initialBalance: z.coerce.number(),
  currencyId: z.string().min(1, "Currency ID is required"),
  _currencySign: z.string().optional(),
  _balance: z.number().optional(),
  minimumBalance: z.number().optional(),
  _minimumBalanceState: z.string().optional(),
});

/**
 * Wallet type inferred from Zod schema
 * This is the single source of truth for Wallet types
 */
export type Wallet = z.infer<typeof WalletSchema>;

/**
 * Extended Wallet type with potential balance (computed field)
 */
export type WalletWithPotentialBalance = Wallet & {
  potentialBalance: number;
};
