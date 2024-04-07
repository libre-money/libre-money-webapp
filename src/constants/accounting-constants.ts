export const AccAccountType = {
  ASSET: "ASEET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
};

export const AccDefaultAccounts: Record<string, { type: string; code: string; name: string }> = {
  EQUITY__OPENING_BALANCE: { type: "Equity", code: "EQUITY__OPENING_BALANCE", name: "Opening Balance" },
  ASSET__CURRENT_ASSET__CASH: { type: "Asset", code: "ASSET__CURRENT_ASSET__CASH", name: "Cash" },
  ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT: { type: "Asset", code: "ASSET__CURRENT_ASSET__BANK_AND_EQUIVALENT", name: "Bank and Equivalent" },
  ASSET__NON_CURRENT_ASSET__HIGH_LIQUIDITY: { type: "Asset", code: "ASSET__NON_CURRENT_ASSET__HIGH_LIQUIDITY", name: "High Liquidity Assets" },
  ASSET__NON_CURRENT_ASSET__MEDIUM_LIQUIDITY: { type: "Asset", code: "ASSET__NON_CURRENT_ASSET__MEDIUM_LIQUIDITY", name: "Medium Liquidity Assets" },
  ASSET__NON_CURRENT_ASSET__LOW_LIQUIDITY: { type: "Asset", code: "ASSET__NON_CURRENT_ASSET__LOW_LIQUIDITY", name: "Low Liquidity Assets" },
  ASSET__NON_CURRENT_ASSET__UNKNOWN_LIQUIDITY: { type: "Asset", code: "ASSET__NON_CURRENT_ASSET__UNKNOWN_LIQUIDITY", name: "Unknown Liquidity Assets" },
  ASSET__ACCOUNTS_RECEIVABLE: { type: "Asset", code: "ASSET__ACCOUNTS_RECEIVABLE", name: "Accounts Receivable" },
  LIABILITY__ACCOUNTS_PAYABLE: { type: "Liability", code: "LIABILITY__ACCOUNTS_PAYABLE", name: "Accounts Payable" },
  LIABILITY__CREDIT_CARD_DEBT: { type: "Liability", code: "LIABILITY__CREDIT_CARD_DEBT", name: "Credit Card Debt" },
  INCOME__COMBINED_INCOME: { type: "Income", code: "INCOME__COMBINED_INCOME", name: "Combined Income" },
  INCOME__MINOR_ADJUSTMENT: { type: "Income", code: "INCOME__MINOR_ADJUSTMENT", name: "Minor Income Adjustment" },
  EXPENSE__COMBINED_EXPENSE: { type: "Expense", code: "EXPENSE__COMBINED_EXPENSE", name: "Combined Expense" },
  EXPENSE__MINOR_ADJUSTMENT: { type: "Expense", code: "EXPENSE__MINOR_ADJUSTMENT", name: "Minor Expense Adjustment" },
};
