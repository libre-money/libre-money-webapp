import { z } from "zod";
import { BaseDocumentSchema } from "./base";
import { Collection, RecordType } from "src/constants/constants";

/**
 * Expense record data schema
 */
const ExpenseDataSchema = z.object({
  expenseAvenueId: z.string().min(1, "Expense avenue ID is required"),
  amount: z.coerce.number(),
  currencyId: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string().min(1, "Currency ID is required")
  ),
  partyId: z.string().nullable(),
  walletId: z.string().min(1, "Wallet ID is required"),
  amountPaid: z.coerce.number(),
  amountUnpaid: z.coerce.number(),
  _currencySign: z.string().optional(),
  _expenseAvenueName: z.string().optional(),
});

/**
 * Income record data schema
 */
const IncomeDataSchema = z.object({
  incomeSourceId: z.string().min(1, "Income source ID is required"),
  amount: z.coerce.number(),
  currencyId: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string().min(1, "Currency ID is required")
  ),
  partyId: z.string().nullable(),
  walletId: z.string().optional(),
  amountPaid: z.coerce.number(),
  amountUnpaid: z.coerce.number(),
  _currencySign: z.string().optional(),
  _incomeSourceName: z.string().optional(),
});

/**
 * Asset purchase record data schema
 */
const AssetPurchaseDataSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  amount: z.coerce.number(),
  currencyId: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string().min(1, "Currency ID is required")
  ),
  partyId: z.string().nullable(),
  walletId: z.string().min(1, "Wallet ID is required"),
  amountPaid: z.coerce.number(),
  amountUnpaid: z.coerce.number(),
});

/**
 * Asset sale record data schema
 */
const AssetSaleDataSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  amount: z.coerce.number(),
  currencyId: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string().min(1, "Currency ID is required")
  ),
  partyId: z.string().nullable(),
  walletId: z.string().min(1, "Wallet ID is required"),
  amountPaid: z.coerce.number(),
  amountUnpaid: z.coerce.number(),
});

/**
 * Asset appreciation/depreciation record data schema
 */
const AssetAppreciationDepreciationDataSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  type: z.string(),
  amount: z.coerce.number(),
  currencyId: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string().min(1, "Currency ID is required")
  ),
});

/**
 * Lending record data schema
 */
const LendingDataSchema = z.object({
  amount: z.coerce.number(),
  walletId: z.string().min(1, "Wallet ID is required"),
  currencyId: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string().min(1, "Currency ID is required")
  ),
  partyId: z.string().min(1, "Party ID is required"),
});

/**
 * Borrowing record data schema
 */
const BorrowingDataSchema = z.object({
  amount: z.coerce.number(),
  walletId: z.string().min(1, "Wallet ID is required"),
  currencyId: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string().min(1, "Currency ID is required")
  ),
  partyId: z.string().min(1, "Party ID is required"),
});

/**
 * Repayment given record data schema
 */
const RepaymentGivenDataSchema = z.object({
  amount: z.coerce.number(),
  walletId: z.string().min(1, "Wallet ID is required"),
  currencyId: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string().min(1, "Currency ID is required")
  ),
  partyId: z.string().min(1, "Party ID is required"),
});

/**
 * Repayment received record data schema
 */
const RepaymentReceivedDataSchema = z.object({
  amount: z.coerce.number(),
  walletId: z.string().min(1, "Wallet ID is required"),
  currencyId: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string().min(1, "Currency ID is required")
  ),
  partyId: z.string().min(1, "Party ID is required"),
});

/**
 * Money transfer record data schema
 */
const MoneyTransferDataSchema = z.object({
  fromWalletId: z.string().min(1, "From wallet ID is required"),
  fromCurrencyId: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string().min(1, "From currency ID is required")
  ),
  fromAmount: z.coerce.number(),
  _fromCurrencySign: z.string().optional(),
  toWalletId: z.string().min(1, "To wallet ID is required"),
  toCurrencyId: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string().min(1, "To currency ID is required")
  ),
  toAmount: z.coerce.number(),
  _toCurrencySign: z.string().optional(),
});

/**
 * Record schema with all optional nested record type data
 * Uses type coercion for numeric fields to handle string inputs from forms
 */
export const RecordSchema = BaseDocumentSchema.extend({
  $collection: z.literal(Collection.RECORD),
  notes: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.string()
  ),
  type: z.string(),
  tagIdList: z.array(z.string()),
  transactionEpoch: z.coerce.number().int(),
  templateName: z.string().optional(),
  expense: ExpenseDataSchema.optional(),
  income: IncomeDataSchema.optional(),
  assetPurchase: AssetPurchaseDataSchema.optional(),
  assetSale: AssetSaleDataSchema.optional(),
  assetAppreciationDepreciation: AssetAppreciationDepreciationDataSchema.optional(),
  lending: LendingDataSchema.optional(),
  borrowing: BorrowingDataSchema.optional(),
  repaymentGiven: RepaymentGivenDataSchema.optional(),
  repaymentReceived: RepaymentReceivedDataSchema.optional(),
  moneyTransfer: MoneyTransferDataSchema.optional(),
}).refine(
  (data) => {
    // Validate that the appropriate nested data exists based on record type
    switch (data.type) {
      case RecordType.EXPENSE:
        return !!data.expense;
      case RecordType.INCOME:
        return !!data.income;
      case RecordType.ASSET_PURCHASE:
        return !!data.assetPurchase;
      case RecordType.ASSET_SALE:
        return !!data.assetSale;
      case RecordType.ASSET_APPRECIATION_DEPRECIATION:
        return !!data.assetAppreciationDepreciation;
      case RecordType.LENDING:
        return !!data.lending;
      case RecordType.BORROWING:
        return !!data.borrowing;
      case RecordType.REPAYMENT_GIVEN:
        return !!data.repaymentGiven;
      case RecordType.REPAYMENT_RECEIVED:
        return !!data.repaymentReceived;
      case RecordType.MONEY_TRANSFER:
        return !!data.moneyTransfer;
      default:
        return true; // Allow unknown types for backward compatibility
    }
  },
  {
    message: "Record type-specific data is required based on the record type",
  }
);

/**
 * Record type inferred from Zod schema
 */
export type Record = z.infer<typeof RecordSchema>;
