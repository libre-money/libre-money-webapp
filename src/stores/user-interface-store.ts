import { defineStore } from "pinia";

function serializeValue(localStorageKey: string, value: any) {
  localStorage.setItem(localStorageKey, JSON.stringify(value));
}

const LOCAL_STORAGE_KEY__ACCOUNTING_EXPANDED = "--lm-ui--accounting-expanded";
const LOCAL_STORAGE_KEY__REPORTS_EXPANDED = "--lm-ui--reports-expanded";
const LOCAL_STORAGE_KEY__ADVANCED_EXPANDED = "--lm-ui--advanced-expanded";
const LOCAL_STORAGE_KEY__PAYABLES_RECEIVABLES_EXPANDED = "--lm-ui--payables-receivables-expanded";
const LOCAL_STORAGE_KEY__ENTITIES_EXPANDED = "--lm-ui--entities-expanded";

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
    reportsExpanded: deserializeBoolean(LOCAL_STORAGE_KEY__REPORTS_EXPANDED, true),
    advancedExpanded: deserializeBoolean(LOCAL_STORAGE_KEY__ADVANCED_EXPANDED, false),
    payablesReceivablesExpanded: deserializeBoolean(LOCAL_STORAGE_KEY__PAYABLES_RECEIVABLES_EXPANDED, true),
    entitiesExpanded: deserializeBoolean(LOCAL_STORAGE_KEY__ENTITIES_EXPANDED, true),
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
    setPayablesReceivablesExpanded(value: boolean) {
      serializeValue(LOCAL_STORAGE_KEY__PAYABLES_RECEIVABLES_EXPANDED, value);
      this.payablesReceivablesExpanded = value;
    },
    setEntitiesExpanded(value: boolean) {
      serializeValue(LOCAL_STORAGE_KEY__ENTITIES_EXPANDED, value);
      this.entitiesExpanded = value;
    },
  },
});
