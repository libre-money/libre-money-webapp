import { defineStore } from "pinia";
import { OFFLINE_DOMAIN } from "src/constants/auth-constants";
import { User } from "src/models/user";

const LOCAL_STORAGE_USER_KEY = "--ck-user";

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
      if (!state.user) return false;
      if (state.user.isOfflineUser && state.user.hasCompletedOnboarding) return true;
      if (!state.user.isOfflineUser) return true;
      return false;
    },
    currentUser(state): User | null {
      return state.user;
    },
  },

  actions: {
    setUser(user: User | null) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      this.user = user;
    },
  },
});
