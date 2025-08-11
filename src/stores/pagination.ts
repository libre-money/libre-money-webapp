import { defineStore } from "pinia";

const LOCAL_STORAGE_KEY = "--lm-pagination-size";

const initialPaginationSize: number = ((): number => {
  const paginationSize = localStorage.getItem(LOCAL_STORAGE_KEY) || "10";
  try {
    return JSON.parse(paginationSize);
  } catch (ex) {
    return 10;
  }
})();

export const usePaginationSizeStore = defineStore("paginationSize", {
  state: () => ({
    paginationSize: initialPaginationSize,
  }),

  getters: {},

  actions: {
    setPaginationSize(paginationSize: number) {
      paginationSize = parseInt(String(paginationSize));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(paginationSize));
      this.paginationSize = paginationSize;
    },
  },
});
