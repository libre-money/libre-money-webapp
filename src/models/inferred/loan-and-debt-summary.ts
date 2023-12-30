export type LoanAndDebtSummary = {
  partyId: string;
  partyName: string;
  incomeReceivable: number;
  salesReceivable: number;
  expensePayable: number;
  purchasePayable: number;
  totalLoansGivenToParty: number;
  totalLoansTakenFromParty: number;
  totalRepaidToParty: number;
  totalRepaidByParty: number;
  totalOwedToParty: number;
  totalOwedByParty: number;
  currencyId: string;
  currencySign: string;
};
