export type PayableItem = {
  recordId: string;
  transactionEpoch: number;
  partyId: string | null;
  partyName: string;
  type: "expense" | "asset-purchase";
  description: string; // expense avenue name or asset name
  originalAmount: number;
  amountPaid: number;
  amountUnpaid: number;
  currencyId: string;
  currencySign: string;
};
