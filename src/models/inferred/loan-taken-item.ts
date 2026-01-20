export type LoanTakenItem = {
  borrowingRecordId: string;
  transactionEpoch: number;
  partyId: string;
  partyName: string;
  amountBorrowed: number;
  amountRepaid: number;
  amountForgiven: number;
  amountOutstanding: number;
  currencyId: string;
  currencySign: string;
};
