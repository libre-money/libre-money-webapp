import { NUMBER_CONFIG } from "src/constants/number-constants";

export type NumberValue = number | string | null | undefined;

export interface NumberFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
  locale?: string;
  fallback?: number;
}

export type NumberFormatOptionsWithoutDecimals = Omit<NumberFormatOptions, "minimumFractionDigits" | "maximumFractionDigits">;

export interface CurrencyFormatOptions extends NumberFormatOptions {
  currencyPosition?: "before" | "after";
  currencySpacing?: string;
}

// Default configurations
const defaultLocale = NUMBER_CONFIG.DEFAULT_LOCALE;
const defaultUseGrouping = NUMBER_CONFIG.USE_GROUPING;
const defaultCurrencyPosition = NUMBER_CONFIG.CURRENCY_POSITION;
const defaultCurrencySpacing = NUMBER_CONFIG.CURRENCY_SPACING;
const defaultFinancialPrecision = NUMBER_CONFIG.FINANCIAL_PRECISION;
const defaultPercentagePrecision = NUMBER_CONFIG.PERCENTAGE_PRECISION;

// Use to parse any number value. Will throw an error if the value is not a number.
export function parseNumber(value: NumberValue): number {
  if (typeof value === "number") {
    if (isNaN(value)) throw new Error(`Invalid number value: ${value}`);
    return value;
  }
  if (value === null || value === undefined || value === "") {
    throw new Error(`Cannot parse null, undefined, or empty value: ${value}`);
  }

  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    throw new Error(`Cannot parse value as number: ${value}`);
  }
  return parsed;
}

// Use to parse financial amounts. Will round the value to the given precision.
export function parseFinancialAmount(value: NumberValue, precision: number): number {
  const parsed = parseNumber(value);
  const operand = Math.pow(10, precision);
  return Math.round(parsed * operand) / operand;
}

// Formatting functions
export function formatNumber(value: any, options: NumberFormatOptions = {}): string {
  const {
    minimumFractionDigits = defaultFinancialPrecision,
    maximumFractionDigits = defaultFinancialPrecision,
    useGrouping = defaultUseGrouping,
    locale = defaultLocale,
    fallback = 0,
  } = options;

  const number = parseNumber(value);

  const formatOptions: Intl.NumberFormatOptions = {
    useGrouping,
  };

  formatOptions.minimumFractionDigits = minimumFractionDigits;
  formatOptions.maximumFractionDigits = maximumFractionDigits;

  return number.toLocaleString(locale, formatOptions);
}

export function formatCurrency(amount: NumberValue, currencySign: string, options: CurrencyFormatOptions = {}): string {
  const { currencyPosition = defaultCurrencyPosition, currencySpacing = defaultCurrencySpacing, ...numberOptions } = options;

  const formattedAmount = formatNumber(amount, numberOptions);

  return currencyPosition === "before" ? `${currencySign}${currencySpacing}${formattedAmount}` : `${formattedAmount}${currencySpacing}${currencySign}`;
}

export function formatCount(value: NumberValue, options: NumberFormatOptionsWithoutDecimals = {}): string {
  return formatNumber(value, { ...options, minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatPercentage(value: NumberValue, options: NumberFormatOptionsWithoutDecimals = {}): string {
  const number = parseNumber(value);
  return `${formatNumber(number, { ...options, minimumFractionDigits: defaultPercentagePrecision, maximumFractionDigits: defaultPercentagePrecision })}%`;
}

// Validation functions
export function isValidNumber(value: NumberValue): boolean {
  if (value === null || value === undefined || value === "") return false;
  try {
    parseNumber(value);
    return true;
  } catch {
    return false;
  }
}

export function isPositiveNumber(value: NumberValue): boolean {
  return isValidNumber(value) && parseNumber(value) > 0;
}

export function isNonNegativeNumber(value: NumberValue): boolean {
  return isValidNumber(value) && parseNumber(value) >= 0;
}

export function isInteger(value: NumberValue): boolean {
  if (!isValidNumber(value)) return false;
  const parsed = parseNumber(value);
  return Number.isInteger(parsed);
}

export function isPositiveInteger(value: NumberValue): boolean {
  return isInteger(value) && parseNumber(value) > 0;
}

export function enforceNonNegativeZero(value: NumberValue): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseFinancialAmount(value, 3);
  if (parsed === 0) return 0;
  return parsed;
}
