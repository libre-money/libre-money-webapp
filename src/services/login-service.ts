import { User } from "src/models/user";
import { useUserStore } from "src/stores/user";

const userStore = useUserStore();

import axios, { AxiosError } from "axios";
import { credentialService } from "./credential-service";
import { configService } from "./config-service";

export const loginService = {
  async logout() {
    try {
      await credentialService.clearCredentials();
      userStore.setUser(null);

      return [true, null];
    } catch (error) {
      console.error(error);
      if (error instanceof AxiosError && error.code === "ERR_BAD_REQUEST") {
        return [false, "Invalid login credentials provided."];
      } else {
        console.debug(error);
        return [false, "Unable to log in."];
      }
    }
  },

  async login(username: string, password: string, shouldRememberPassword: boolean) {
    try {
      await credentialService.storeCredentials(username, password, shouldRememberPassword);

      const validateUrl = `${configService.getRemoteServerUrl()}/${configService.getDomainName()}/_all_docs`;
      const validateResponse = await axios.get(validateUrl, {
        auth: credentialService.getCredentials(),
      });

      const user = {
        domain: configService.getDomainName()!,
        username,
        loginAt: Date.now(),
      };

      userStore.setUser(user);

      return [true, null];
    } catch (error) {
      console.error(error);
      if (error instanceof AxiosError && error.code === "ERR_BAD_REQUEST") {
        return [false, "Invalid login credentials provided."];
      } else {
        console.debug(error);
        return [false, "Unable to log in."];
      }
    }
  },

  async updateAndTestCredentials(username: string, password: string) {
    try {
      await credentialService.storeCredentials(username, password, false);

      const validateUrl = `${configService.getRemoteServerUrl()}/${configService.getDomainName()}/_all_docs`;
      const validateResponse = await axios.get(validateUrl, {
        auth: credentialService.getCredentials(),
      });

      return [true, null];
    } catch (error) {
      console.error(error);
      if (error instanceof AxiosError && error.code === "ERR_BAD_REQUEST") {
        return [false, "Invalid login credentials provided."];
      } else {
        console.debug(error);
        return [false, "Unable to log in."];
      }
    }
  },
};
