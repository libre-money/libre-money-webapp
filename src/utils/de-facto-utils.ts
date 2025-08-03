import { currencyFormatService } from "src/services/currency-format-service";
import { NumberValue, parseNumber, formatCurrency, formatCount, formatNumber, parseFinancialAmount } from "./number-utils";

export function printCurrency(amount: NumberValue, currencySign: string): string {
  return formatCurrency(amount, currencySign, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
    currencyPosition: "after",
    currencySpacing: " ",
  });
}

export function printCount(amount: NumberValue): string {
  return formatCount(amount, {
    useGrouping: true,
  });
}

export function printPercentage(amount: NumberValue): string {
  if (amount === null || amount === undefined) return "0.00%";
  try {
    const number = parseNumber(amount);
    return `${formatNumber(number, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}%`;
  } catch {
    return "0.00%";
  }
}

export function printAmount(amount: NumberValue, currencyId: string | null | undefined): string {
  if (!currencyId) {
    return printCount(asAmount(amount));
  }

  return currencyFormatService.getPrintableAmountWithCurrencyAndConfiguration(asAmount(amount), currencyId, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
    currencyPosition: "after",
    currencySpacing: " ",
  });
}

/*
 This is the new all-purpose function for parsing numbers. Behavior -
   1. It'll parse anything parseable.
   2. It'll return 0 if the input is null/undefined or anything that's not parseable
   3. It'll round numbers to precision of 2 decimal places.

*/
export function asAmount(amount: NumberValue): number {
  if (amount === null || amount === undefined) return 0;
  try {
    return parseFinancialAmount(amount, 2);
  } catch {
    return 0;
  }
}

/*
 This is the new all-purpose function for parsing numbers (RAW). Behavior -
   1. It'll parse anything parseable.
   2. It'll return 0 if the input is null/undefined or anything that's not parseable
   3. It'll return the raw number without rounding.
*/
export function asRawAmount(amount: NumberValue): number {
  if (amount === null || amount === undefined) return 0;
  try {
    return parseNumber(amount);
  } catch {
    return 0;
  }
}
