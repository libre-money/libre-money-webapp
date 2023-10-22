import { User } from "src/models/user";
import { useUserStore } from "src/stores/user";

const userStore = useUserStore();

import axios, { AxiosError } from "axios";
import { remoteDataDatabaseName, remoteServerUrl } from "src/constants/config";
import { credentialService } from "./credential-service";

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

  async login(username: string, password: string) {
    try {
      await credentialService.storeCredentials(username, password);

      const validateUrl = `${remoteServerUrl}/${remoteDataDatabaseName}/_all_docs`;
      const validateResponse = await axios.get(validateUrl, {
        auth: credentialService.getCredentials(),
      });

      const user = {
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
      await credentialService.storeCredentials(username, password);

      const validateUrl = `${remoteServerUrl}/${remoteDataDatabaseName}/_all_docs`;
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
