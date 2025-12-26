import { defineStore } from "pinia";

function deserializeString(localStorageKey: string): string | null {
  const value = localStorage.getItem(localStorageKey) || "null";
  try {
    return JSON.parse(value);
  } catch (ex) {
    return null;
  }
}

function deserializeBoolean(localStorageKey: string): boolean {
  const value = localStorage.getItem(localStorageKey) || "true";
  try {
    return JSON.parse(value);
  } catch (ex) {
    return false;
  }
}

function deserializeNumber(localStorageKey: string, defaultValue: number): number {
  const value = localStorage.getItem(localStorageKey) || String(defaultValue);
  try {
    return JSON.parse(value);
  } catch (ex) {
    return defaultValue;
  }
}

function serializeValue(localStorageKey: string, value: any) {
  localStorage.setItem(localStorageKey, JSON.stringify(value));
}

const LOCAL_STORAGE_KEY__CURRENCY_ID = "--lm-settings--default-currency-id";
const LOCAL_STORAGE_KEY__DEFAULT_VIEW = "--lm-settings--default-view";
const LOCAL_STORAGE_KEY__REMEMBER_VIEW = "--lm-settings--remember-view";
const LOCAL_STORAGE_KEY__LAST_VIEW = "--lm-settings--last-opened-view";
const LOCAL_STORAGE_KEY__WALLET_CALIBRATION_STEP_SIZE = "--lm-settings--wallet-calibration-step-size";
const LOCAL_STORAGE_KEY__DARK_MODE = "--lm-settings--dark-mode";

export const useSettingsStore = defineStore("settingsStore", {
  state: () => ({
    defaultCurrencyId: deserializeString(LOCAL_STORAGE_KEY__CURRENCY_ID),
    defaultView: deserializeString(LOCAL_STORAGE_KEY__DEFAULT_VIEW) || "overview",
    rememberLastOpenedView: deserializeBoolean(LOCAL_STORAGE_KEY__REMEMBER_VIEW),
    lastOpenedView: deserializeString(LOCAL_STORAGE_KEY__LAST_VIEW) || "overview",
    walletCalibrationStepSize: deserializeNumber(LOCAL_STORAGE_KEY__WALLET_CALIBRATION_STEP_SIZE, 100),
    darkMode: deserializeBoolean(LOCAL_STORAGE_KEY__DARK_MODE),
  }),

  getters: {},

  actions: {
    setDefaultCurrencyId(value: string) {
      serializeValue(LOCAL_STORAGE_KEY__CURRENCY_ID, value);
      this.defaultCurrencyId = value;
    },
    setDefaultView(value: string) {
      serializeValue(LOCAL_STORAGE_KEY__DEFAULT_VIEW, value);
      this.defaultView = value;
    },
    setRememberLastOpenedView(value: boolean) {
      serializeValue(LOCAL_STORAGE_KEY__REMEMBER_VIEW, value);
      this.rememberLastOpenedView = value;
    },
    setLastOpenedView(value: string) {
      serializeValue(LOCAL_STORAGE_KEY__LAST_VIEW, value);
      this.lastOpenedView = value;
    },
    setWalletCalibrationStepSize(value: number) {
      serializeValue(LOCAL_STORAGE_KEY__WALLET_CALIBRATION_STEP_SIZE, value);
      this.walletCalibrationStepSize = value;
    },
    setDarkMode(value: boolean) {
      serializeValue(LOCAL_STORAGE_KEY__DARK_MODE, value);
      this.darkMode = value;
    },
  },
});
