import { Currency } from "src/schemas/currency";

export type AccLedgerFilters = {
  startEpoch: number;
  endEpoch: number;
  filterByCurrencyId: string | null;
  _currency?: Currency;
};
