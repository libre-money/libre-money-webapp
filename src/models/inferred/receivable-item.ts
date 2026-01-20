export type ReceivableItem = {
  recordId: string;
  transactionEpoch: number;
  partyId: string | null;
  partyName: string;
  type: "income" | "asset-sale";
  description: string; // income source name or asset name
  originalAmount: number;
  amountReceived: number;
  amountUnpaid: number;
  currencyId: string;
  currencySign: string;
};
