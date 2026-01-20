export type LoanGivenItem = {
  lendingRecordId: string;
  transactionEpoch: number;
  partyId: string;
  partyName: string;
  amountLent: number;
  amountRepaid: number;
  amountForgiven: number;
  amountOutstanding: number;
  currencyId: string;
  currencySign: string;
};
