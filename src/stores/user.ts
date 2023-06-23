import { defineStore } from "pinia";
import { User } from "src/models/user";

const LOCAL_STORAGE_USER_KEY = "--user";

const initialUser: User | null = ((): User | null => {
  const user = localStorage.getItem(LOCAL_STORAGE_USER_KEY) || "null";
  try {
    return JSON.parse(user);
  } catch (ex) {
    return null;
  }
})();

export const useUserStore = defineStore("user", {
  state: () => ({
    user: initialUser,
  }),

  getters: {
    isUserLoggedIn(state): boolean {
      return !!state.user;
    },
    currentUser(state): User | null {
      return state.user;
    },
  },

  actions: {
    setUser(user: User) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      this.user = user;
    },
  },
});
