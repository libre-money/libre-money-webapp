export type RecordFilters = {
  startEpoch: number;
  endEpoch: number;
  recordTypeList: string[];
  tagList: string[];
  partyId?: string | null;
  walletId?: string | null;
  searchString: string;
};
