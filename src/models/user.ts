export type User = {
  domain: string;
  username: string;
  loginAt: number;
  isOfflineUser?: boolean;
  hasCompletedOnboarding?: boolean;
  selectedCurrencyId?: string;
};
