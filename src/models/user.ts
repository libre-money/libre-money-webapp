export type User = {
  // -- server and domain
  serverUrl: string;
  domain: string;
  // -- user info
  username: string;
  loginAt: number;
  isOfflineUser?: boolean;
  isDemoUser?: boolean;
  hasCompletedOnboarding?: boolean;
  selectedCurrencyId?: string;
  hasSignedUpForCloudAccount?: boolean;
  cloudAccountEmail?: string;
};
