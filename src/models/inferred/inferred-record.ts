import { Record } from "src/models/record";
import { ExpenseAvenue } from "../expense-avenue";
import { Party } from "../party";
import { Tag } from "../tag";

export type InferredRecord = Record & {
  expense?: {
    expenseAvenue: ExpenseAvenue;
    party: Party;
  };
  tagList: Tag[];
};
