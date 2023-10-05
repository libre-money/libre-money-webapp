export type Record = {
  _id?: string;
  _rev?: string;
  $collection: string;
  notes: string;
  type: string; // enum RecordType
  tagIdList: string[];
  transactionEpoch: number;
  templateName?: string;
  expense?: {
    // essential
    expenseAvenueId: string;
    amount: number;
    currencyId: string;
    partyId: string | null;
    // payment
    walletId: string;
    amountPaid: number;
    // due
    amountUnpaid: number;
    // cache
    _currencySign?: string;
    _expenseAvenueName?: string;
  };
  income?: {
    // essential
    incomeSourceId: string;
    amount: number;
    currencyId: string;
    partyId: string | null;
    // payment
    walletId?: string;
    amountPaid: number;
    // due
    amountUnpaid: number;
    // cache
    _currencySign?: string;
    _incomeSourceName?: string;
  };
  assetPurchase?: {
    // essential
    assetId: string;
    amount: number;
    currencyId: string;
    partyId: string | null;
    // payment
    walletId: string;
    amountPaid: number;
    // due
    amountUnpaid: number;
  };
  assetSale?: {
    // essential
    assetId: string;
    amount: number;
    currencyId: string;
    partyId: string | null;
    // payment
    walletId: string;
    amountPaid: number;
    // due
    amountUnpaid: number;
  };
  assetAppreciationDepreciation?: {
    // essential
    assetId: string;
    type: string;
    amount: number;
    currencyId: string;
  };
  lending?: {
    // essential
    amount: number;
    walletId: string;
    currencyId: string;
    partyId: string;
  };
  borrowing?: {
    // essential
    amount: number;
    walletId: string;
    currencyId: string;
    partyId: string;
  };
  repaymentGiven?: {
    // essential
    amount: number;
    walletId: string;
    currencyId: string;
    partyId: string;
  };
  repaymentReceived?: {
    // essential
    amount: number;
    walletId: string;
    currencyId: string;
    partyId: string;
  };
  moneyTransfer?: {
    fromWalletId: string;
    fromCurrencyId: string;
    fromAmount: number;
    _fromCurrencySign?: string;

    toWalletId: string;
    toCurrencyId: string;
    toAmount: number;
    _toCurrencySign?: string;
  };
};
