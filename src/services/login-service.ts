import { User } from "src/models/user";
import { useUserStore } from "src/stores/user";

const userStore = useUserStore();

export const loginService = {
  login(username: string, password: string) {
    const mockUser: User = {
      username,
      cookie: "PLACEHOLDER",
      loginAt: Date.now(),
    };
    userStore.setUser(mockUser);
  },
};
