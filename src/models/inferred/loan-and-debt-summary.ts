export type LoanAndDebtSummary = {
  partyId: string;
  partyName: string;
  totalLoansGivenToParty: number;
  totalLoansTakenFromParty: number;
  totalRepaidToParty: number;
  totalRepaidByParty: number;
  totalOwedToParty: number;
  totalOwedByParty: number;
  currencyId: string;
  currencySign: string;
};
