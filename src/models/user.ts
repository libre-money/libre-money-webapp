export type User = {
  // -- server and domain
  serverUrl: string;
  domain: string;
  // -- user info
  username: string;
  loginAt: number;
  isOfflineUser?: boolean;
  hasCompletedOnboarding?: boolean;
  selectedCurrencyId?: string;
};
