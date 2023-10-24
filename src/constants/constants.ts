export const rowsPerPageOptions = [10, 20, 50, 100];

export const partyTypeList = [
  { value: "party", label: "Party" },
  { value: "vendor", label: "Vendor" },
];

export const defaultPartyType = "party";

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
  BUDGET: "budget",
};

export const RecordType = {
  INCOME: "income",
  EXPENSE: "expense",
  ASSET_PURCHASE: "asset-purchase",
  ASSET_SALE: "asset-sale",
  ASSET_APPRECIATION_DEPRECIATION: "asset-appreciation-depreciation",
  LENDING: "lending", // outgoing loan (receivable)
  BORROWING: "borrowing", // incoming loan (payable)
  REPAYMENT_GIVEN: "repayment-given",
  REPAYMENT_RECEIVED: "repayment-received",
  MONEY_TRANSFER: "money-transfer",
};

export const defaultTagColor = "#444444";
