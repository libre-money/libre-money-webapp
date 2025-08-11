import { defineStore } from "pinia";
import { RecordFilters } from "src/models/inferred/record-filters";

const LOCAL_STORAGE_KEY = "--lm-record-filters";

const initialRecordFilters: RecordFilters | null = ((): RecordFilters | null => {
  const recordFilters = localStorage.getItem(LOCAL_STORAGE_KEY) || "null";
  try {
    return JSON.parse(recordFilters);
  } catch (ex) {
    return null;
  }
})();

export const useRecordFiltersStore = defineStore("recordFilters", {
  state: () => ({
    recordFilters: initialRecordFilters,
  }),

  getters: {
    currentRecordFilters(state): RecordFilters | null {
      return state.recordFilters;
    },
  },

  actions: {
    setRecordFilters(recordFilters: RecordFilters | null) {
      this.recordFilters = recordFilters;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recordFilters));
    },
  },
});
