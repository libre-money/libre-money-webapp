export type Wallet = {
  _id?: string;
  _rev?: string;
  $collection: string;
  name: string;
  type: string;
  initialBalance: number;
  currencyId: string;
  _currencySign?: string;
  _balance?: number;
  minimumBalance?: number;
  _minimumBalanceState?: string;
};

export type WalletWithPotentialBalance = Wallet & {
  potentialBalance: number;
};
