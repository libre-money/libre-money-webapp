import { Record } from "src/schemas/record";
import { ExpenseAvenue } from "src/schemas/expense-avenue";
import { Party } from "src/schemas/party";
import { Tag } from "src/schemas/tag";
import { Wallet } from "src/schemas/wallet";
import { IncomeSource } from "src/schemas/income-source";
import { Asset } from "src/schemas/asset";
import { User } from "../user";

export type InferredRecord = Record & {
  expense?: {
    expenseAvenue: ExpenseAvenue;
    party: Party;
    wallet: Wallet;
  };
  income?: {
    incomeSource: IncomeSource;
    party: Party;
    wallet: Wallet;
  };
  moneyTransfer?: {
    fromWallet: Wallet;
    toWallet: Wallet;
  };

  lending?: {
    party: Party;
    wallet: Wallet;
  };
  borrowing?: {
    party: Party;
    wallet: Wallet;
  };
  repaymentGiven?: {
    party: Party;
    wallet: Wallet;
  };
  repaymentReceived?: {
    party: Party;
    wallet: Wallet;
  };

  assetPurchase?: {
    asset: Asset;
    party: Party;
    wallet: Wallet;
  };
  assetSale?: {
    asset: Asset;
    party: Party;
    wallet: Wallet;
  };
  assetAppreciationDepreciation?: {
    asset: Asset;
  };

  payablePayment?: {
    party: Party;
    wallet: Wallet;
    originalRecord: Record;
  };
  receivableReceipt?: {
    party: Party;
    wallet: Wallet;
    originalRecord: Record;
  };
  loanForgivenessGiven?: {
    party: Party;
    originalLendingRecord: Record;
  };
  loanForgivenessReceived?: {
    party: Party;
    originalBorrowingRecord: Record;
  };

  tagList: Tag[];
  typePrettified: string;
};
