import { ExpenseAvenue } from "src/schemas/expense-avenue";
import { Wallet } from "src/schemas/wallet";

export type ExpenseRecordSuggestion = {
  wallet?: Wallet;
  expenseAvenue?: ExpenseAvenue;
  date?: string;
  amount?: number;
  notes?: string;
};
