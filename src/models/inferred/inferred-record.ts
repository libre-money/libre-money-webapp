import { Record } from "src/models/record";
import { ExpenseAvenue } from "../expense-avenue";
import { Party } from "../party";
import { Tag } from "../tag";
import { Wallet } from "../wallet";
import { IncomeSource } from "../income-source";

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
  tagList: Tag[];
  typePrettified: string;
};
