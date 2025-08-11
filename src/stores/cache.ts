import { defineStore } from "pinia";

function deserializeString(localStorageKey: string): string | null {
  const value = localStorage.getItem(localStorageKey) || "null";
  try {
    return JSON.parse(value);
  } catch (ex) {
    return null;
  }
}

function serializeString(localStorageKey: string, value: string) {
  localStorage.setItem(localStorageKey, JSON.stringify(value));
}

const LOCAL_STORAGE_KEY__CURRENCY_ID = "--lm-cache--last-used-currency-id";

export const useCacheStore = defineStore("cacheStore", {
  state: () => ({
    lastUsedCurrencyId: deserializeString(LOCAL_STORAGE_KEY__CURRENCY_ID),
  }),

  getters: {},

  actions: {
    setLastUsedCurrencyId(value: string) {
      serializeString(LOCAL_STORAGE_KEY__CURRENCY_ID, value);
      this.lastUsedCurrencyId = value;
    },
  },
});
