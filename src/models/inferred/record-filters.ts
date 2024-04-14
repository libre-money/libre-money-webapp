export type RecordFilters = {
  startEpoch: number;
  endEpoch: number;
  recordTypeList: string[];
  tagIdWhiteList: string[];
  tagIdBlackList: string[];
  partyId?: string | null;
  walletId?: string | null;
  searchString: string;
  deepSearchString: string;
  sortBy: string; // transactionEpochDesc | lastModifiedEpochDesc
};
