import { User } from "src/models/user";
import { useUserStore } from "src/stores/user";

const userStore = useUserStore();

import axios, { AxiosError } from "axios";
import { credentialService } from "./credential-service";
import { configService } from "./config-service";
import { localDataService } from "./local-data-service";

export const authService = {
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

  async login(serverUrl: string, domain: string, username: string, password: string, shouldRememberPassword: boolean) {
    try {
      const validateUrl = `${serverUrl}/${domain}/_all_docs`;
      const validateResponse = await axios.get(validateUrl, {
        auth: {
          username,
          password,
        },
      });

      if (validateResponse.status !== 200) {
        return [false, "Invalid login credentials provided."];
      }

      configService.setRemoteServerUrl(serverUrl);
      configService.setDomainName(domain);
      await credentialService.storeCredentials(username, password, shouldRememberPassword);

      const user = {
        domain,
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
      const { domain, serverUrl } = configService.getServerUrlAndDomainNameOrFail();

      const validateUrl = `${serverUrl}/${domain}/_all_docs`;
      const validateResponse = await axios.get(validateUrl, {
        auth: credentialService.getCredentials(),
      });

      if (validateResponse.status !== 200) {
        return [false, "Invalid login credentials provided."];
      }

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
