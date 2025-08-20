export type RecordFilters = {
  startEpoch: number;
  endEpoch: number;
  recordTypeList: string[];
  tagIdWhiteList: string[];
  tagIdBlackList: string[];
  partyId?: string | null;
  currencyId?: string | null;
  walletId?: string | null;
  searchString: string;
  deepSearchString: string;
  sortBy: "transactionEpochDesc" | "lastModifiedEpochDesc";
  type: "standard" | "budget" | "loansAndDebts" | "parties";
  _budgetName?: string;
  _partyName?: string;
  _preset?: string;
  highlightDuplicates?: boolean;
};
