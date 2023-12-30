import { Currency } from "../currency";

export type QuickSummary = {
  currency: Currency;
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  totalInFlow: number;
  totalOutFlow: number;
  totalFlowBalance: number;
};
