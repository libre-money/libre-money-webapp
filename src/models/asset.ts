export type Asset = {
  _id?: string;
  _rev?: string;
  $collection: string;
  name: string;
  type: string;
  liquidity: string;
  initialBalance: number;
  currencyId: string;
  _currencySign?: string;
  _balance?: number;
};
