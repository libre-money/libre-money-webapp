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

const LOCAL_STORAGE_KEY__CURRENCY_ID = "--settings--default-currency-id";

export const useSettingsStore = defineStore("settingsStore", {
  state: () => ({
    defaultCurrencyId: deserializeString(LOCAL_STORAGE_KEY__CURRENCY_ID),
  }),

  getters: {},

  actions: {
    setDefaultCurrencyId(value: string) {
      serializeString(LOCAL_STORAGE_KEY__CURRENCY_ID, value);
      this.defaultCurrencyId = value;
    },
  },
});
