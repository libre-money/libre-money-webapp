import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null,
  }),

  getters: {
    isUserLoggedIn(state) {
      return !!state.user;
    },
    currentUser(state) {
      return state.user;
    },
  },

  actions: {
    setUser() {
      this.user = null;
    },
  },
});
