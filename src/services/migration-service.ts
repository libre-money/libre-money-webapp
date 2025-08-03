import { QVueGlobals } from "quasar";
import { pouchdbService } from "./pouchdb-service";
import { Collection, fixtureCode } from "src/constants/constants";
import { ExpenseAvenue } from "src/models/expense-avenue";
import { IncomeSource } from "src/models/income-source";

class MigrationService {
  async migrateDefaultExpenseAvenueAndIncomeSource($q: QVueGlobals) {
    console.debug("Attempting migration...");

    const expenseAvenueList = (await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE)).docs as ExpenseAvenue[];
    const incomeSourceList = (await pouchdbService.listByCollection(Collection.INCOME_SOURCE)).docs as IncomeSource[];

    // Add auto-calibrated expense avenue
    {
      const expectedCode = fixtureCode.AUTO_CALIBRATED_EXPENSE;
      const autoCalibratedExpenseAvenue = expenseAvenueList.find((expenseAvenue) => expenseAvenue.fixtureCode === expectedCode);
      if (!autoCalibratedExpenseAvenue) {
        const newExpenseAvenue: ExpenseAvenue = {
          $collection: Collection.EXPENSE_AVENUE,
          name: "Auto-calibrated Expense",
          fixtureCode: expectedCode,
          dissuadeEditing: true,
          denyDeletion: true,
        };
        await pouchdbService.upsertDoc(newExpenseAvenue);
      }
    }

    // Add auto-calibrated income source
    {
      const expectedCode = fixtureCode.AUTO_CALIBRATED_INCOME;
      const autoCalibratedIncomeSource = incomeSourceList.find((incomeSource) => incomeSource.fixtureCode === expectedCode);
      if (!autoCalibratedIncomeSource) {
        const newIncomeSource: IncomeSource = {
          $collection: Collection.INCOME_SOURCE,
          name: "Auto-calibrated Income",
          fixtureCode: expectedCode,
          dissuadeEditing: true,
          denyDeletion: true,
        };
        await pouchdbService.upsertDoc(newIncomeSource);
      }
    }
  }
}

export const migrationService = new MigrationService();
