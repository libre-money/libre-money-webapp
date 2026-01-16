import { defineStore } from "pinia";

function serializeValue(localStorageKey: string, value: any) {
  localStorage.setItem(localStorageKey, JSON.stringify(value));
}

const LOCAL_STORAGE_KEY__ACCOUNTING_EXPANDED = "--lm-ui--accounting-expanded";
const LOCAL_STORAGE_KEY__REPORTS_EXPANDED = "--lm-ui--reports-expanded";
const LOCAL_STORAGE_KEY__ADVANCED_EXPANDED = "--lm-ui--advanced-expanded";

function deserializeBoolean(localStorageKey: string, defaultValue = false) {
  const value = localStorage.getItem(localStorageKey);
  if (value === null) return defaultValue;
  try {
    return JSON.parse(value);
  } catch (ex) {
    return defaultValue;
  }
}

export const useUserInterfaceStore = defineStore("userInterfaceStore", {
  state: () => ({
    accountingExpanded: deserializeBoolean(LOCAL_STORAGE_KEY__ACCOUNTING_EXPANDED, false),
    reportsExpanded: deserializeBoolean(LOCAL_STORAGE_KEY__REPORTS_EXPANDED, false),
    advancedExpanded: deserializeBoolean(LOCAL_STORAGE_KEY__ADVANCED_EXPANDED, false),
  }),

  getters: {},

  actions: {
    setAccountingExpanded(value: boolean) {
      serializeValue(LOCAL_STORAGE_KEY__ACCOUNTING_EXPANDED, value);
      this.accountingExpanded = value;
    },
    setReportsExpanded(value: boolean) {
      serializeValue(LOCAL_STORAGE_KEY__REPORTS_EXPANDED, value);
      this.reportsExpanded = value;
    },
    setAdvancedExpanded(value: boolean) {
      serializeValue(LOCAL_STORAGE_KEY__ADVANCED_EXPANDED, value);
      this.advancedExpanded = value;
    },
  },
});
