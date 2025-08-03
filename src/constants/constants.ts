export const rowsPerPageOptions = [10, 20, 50, 100];

export const partyTypeList = [
  { value: "party", label: "Party" },
  { value: "vendor", label: "Vendor" },
];

export const defaultPartyType = "party";

export const sortByTypeList = [
  { value: "transactionEpochDesc", label: "Transaction Time (Latest on Top)" },
  { value: "lastModifiedEpochDesc", label: "Modification Time (Latest on Top)" },
];

export const walletTypeList = [
  { value: "cash", label: "Cash" },
  { value: "credit-card", label: "Credit Card" },
  { value: "bank", label: "Bank" },
  { value: "app", label: "App" },
  { value: "other", label: "Other" },
];

export const defaultAssetType = "investment";

export const assetTypeList = [
  { value: "investment", label: "Investment" },
  { value: "property", label: "Property" },
  { value: "trust-fund", label: "Trust Fund" },
  { value: "long-term-deposit", label: "Long Term Deposit" },
  { value: "other", label: "Other" },
];

export const defaultAssetLiquidity = "unsure";

export const assetLiquidityList = [
  { value: "high", label: "High" },
  { value: "moderate", label: "Moderate" },
  { value: "low", label: "Low" },
  { value: "unsure", label: "Unsure" },
];

export const defaultViewOptionList = [
  { value: "overview", label: "Overview" },
  { value: "records", label: "Records" },
  { value: "templates", label: "Templates" },
];

export const rollOverRuleList = [
  { value: "always", label: "Always" },
  { value: "never", label: "Never" },
  { value: "positive-only", label: "Positive Only" },
  { value: "negative-only", label: "Negative Only" },
];

export const defaultRollOverRule = "positive-only";

export const defaultWalletType = "cash";

export const Collection = {
  PARTY: "party",
  TAG: "tag",
  INCOME_SOURCE: "income-source",
  EXPENSE_AVENUE: "expense-avenue",
  CURRENCY: "currency",
  WALLET: "wallet",
  ASSET: "asset",
  RECORD: "record",
  RECORD_TEMPLATE: "record-template",
  ROLLING_BUDGET: "rolling-budget",
  MEMO: "memo",
  TEXT_IMPORT_RULES: "text-import-rules",
};

export const RecordType = {
  INCOME: "income",
  EXPENSE: "expense",
  MONEY_TRANSFER: "money-transfer",
  ASSET_PURCHASE: "asset-purchase",
  ASSET_SALE: "asset-sale",
  ASSET_APPRECIATION_DEPRECIATION: "asset-appreciation-depreciation",
  LENDING: "lending", // outgoing loan (receivable)
  BORROWING: "borrowing", // incoming loan (payable)
  REPAYMENT_GIVEN: "repayment-given",
  REPAYMENT_RECEIVED: "repayment-received",
};

export const defaultTagColor = "#444444";

export const dateRangePresetList = [
  { value: "current-year", label: "Current Year" },
  { value: "previous-year", label: "Previous Year" },
  { value: "current-month", label: "Current Month" },
  { value: "previous-month", label: "Previous Month" },
  { value: "current-and-previous-month", label: "Current and Previous Month" },
  { value: "all-time", label: "All time" },
  { value: "custom", label: "Custom" },
];

export const fixtureCode = {
  AUTO_CALIBRATED_EXPENSE: "auto-calibrated-expense",
  AUTO_CALIBRATED_INCOME: "auto-calibrated-income",
};
