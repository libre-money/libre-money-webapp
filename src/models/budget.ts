export type Budget = {
  _id?: string;
  _rev?: string;
  $collection: string;
  name: string;
  startEpoch: number;
  endEpoch: number;
  warningLimit: number;
  overflowLimit: number;
  includeExpenses: boolean;
  includeAssetPurchases: boolean;
  tagIdWhiteList: string[];
  tagIdBlackList: string[];
  currencyId: string;
  _currencySign?: string;
  _usedAmount: number;
};
