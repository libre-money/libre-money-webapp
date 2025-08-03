import { defineStore } from "pinia";

const LOCAL_STORAGE_KEY = "--ck-record-pagination-size";

const initialRecordPaginationSize: number = ((): number => {
  const recordPaginationSize = localStorage.getItem(LOCAL_STORAGE_KEY) || "10";
  try {
    return JSON.parse(recordPaginationSize);
  } catch (ex) {
    return 10;
  }
})();

export const useRecordPaginationSizeStore = defineStore("recordPaginationSize", {
  state: () => ({
    recordPaginationSize: initialRecordPaginationSize,
  }),

  getters: {},

  actions: {
    setRecordPaginationSize(recordPaginationSize: number) {
      recordPaginationSize = parseInt(String(recordPaginationSize));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recordPaginationSize));
      this.recordPaginationSize = recordPaginationSize;
    },
  },
});
