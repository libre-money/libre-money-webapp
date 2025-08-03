import { ExpenseAvenue } from "../expense-avenue";
import { Wallet } from "../wallet";

export type ExpenseRecordSuggestion = {
  wallet?: Wallet;
  expenseAvenue?: ExpenseAvenue;
  date?: string;
  amount?: number;
  notes?: string;
};
