export type RecordFilters = {
  startEpoch: number;
  endEpoch: number;
  recordTypeList: string[];
  tagList: string[];
  partyId?: string | null;
};
