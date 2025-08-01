export interface CurrencyOption {
  label: string;
  value: string;
}

export interface CurrencyInfo {
  name: string;
  sign: string;
}

export const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  USD: { name: "US Dollar", sign: "USD" },
  EUR: { name: "Euro", sign: "EUR" },
  GBP: { name: "British Pound", sign: "GBP" },
  JPY: { name: "Japanese Yen", sign: "JPY" },
  CAD: { name: "Canadian Dollar", sign: "CAD" },
  AUD: { name: "Australian Dollar", sign: "AUD" },
  CHF: { name: "Swiss Franc", sign: "CHF" },
  CNY: { name: "Chinese Yuan", sign: "CNY" },
  BDT: { name: "Bangladeshi Taka", sign: "BDT" },
};

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  ...Object.entries(CURRENCY_MAP).map(([code, info]) => ({
    label: `${info.name} (${code})`,
    value: code,
  })),
  { label: "Custom Currency", value: "custom" },
];
