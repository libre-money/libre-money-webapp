import { User } from "src/models/user";
import { useUserStore } from "src/stores/user";
import { previousSessionService } from "./previous-session-service";
import { auditLogService } from "./audit-log-service";

const userStore = useUserStore();

import axios, { AxiosError } from "axios";
import { credentialService } from "./credential-service";
import { configService } from "./config-service";
import { localDataService } from "./local-data-service";
import { AUTH_SERVER_URL } from "src/constants/config-constants";

export interface AuthServerResponse {
  serverUrl: string;
  domain: string;
  username: string;
}

export interface LaunchPromoSignupResponse {
  message: string;
  wasAlreadyRegistered: boolean;
}

export interface TelemetryResponse {
  message: string;
}

export type TelemetryCurrency = string | { name: string; sign: string };

export interface TelemetryPayload {
  username: string;
  currency: TelemetryCurrency;
  email?: string;
}

export const authService = {
  /**
   * Authenticates with the auth server using username and password.
   * Returns serverUrl, domain, and username if successful.
   */
  async fetchAuthDetailsFromAuthServer(username: string, password: string): Promise<[boolean, AuthServerResponse | null, string | null]> {
    try {
      const response = await axios.post<AuthServerResponse>(
        `${AUTH_SERVER_URL}/pre-authenticate`,
        {
          username,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 && response.data) {
        return [true, response.data, null];
      }

      return [false, null, "Invalid response from authentication server."];
    } catch (error) {
      console.error(error);
      if (error instanceof AxiosError) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          return [false, null, "Invalid username or password."];
        }
        if (error.response?.status) {
          return [false, null, `Authentication server error: ${error.response.status}`];
        }
        if (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
          return [false, null, "Unable to connect to authentication server. Please check your connection."];
        }
      }
      return [false, null, "Unable to authenticate. Please try again."];
    }
  },

  /**
   * Submits a launch promo signup request with email and fullname.
   * Returns the response if successful.
   */
  async submitLaunchPromoSignup(email: string, fullname: string): Promise<[boolean, LaunchPromoSignupResponse | null, string | null]> {
    try {
      const response = await axios.post<LaunchPromoSignupResponse>(
        `${AUTH_SERVER_URL}/ephemeral/launch-promo-signup`,
        {
          email: email.trim().toLowerCase(),
          fullname: fullname.trim(),
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 && response.data) {
        return [true, response.data, null];
      }

      return [false, null, "Invalid response from server."];
    } catch (error) {
      console.error(error);
      if (error instanceof AxiosError) {
        if (error.response?.status === 400) {
          const errorMessage = error.response.data?.error || "Invalid request. Please check your information.";
          return [false, null, errorMessage];
        }
        if (error.response?.status) {
          return [false, null, `Server error: ${error.response.status}`];
        }
        if (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
          return [false, null, "Unable to connect to server. Please check your connection."];
        }
      }
      return [false, null, "Unable to submit signup. Please try again."];
    }
  },

  /**
   * Submits telemetry data for offline onboarding.
   * Returns the response if successful.
   */
  async submitTelemetry(payload: TelemetryPayload): Promise<[boolean, TelemetryResponse | null, string | null]> {
    try {
      const requestBody: TelemetryPayload = {
        username: payload.username.trim(),
        currency: payload.currency,
      };

      // Format currency properly
      if (typeof payload.currency === "object") {
        requestBody.currency = {
          name: payload.currency.name.trim(),
          sign: payload.currency.sign.trim(),
        };
      } else {
        requestBody.currency = payload.currency.trim();
      }

      // Add email if provided
      if (payload.email && payload.email.trim()) {
        requestBody.email = payload.email.trim().toLowerCase();
      }

      const response = await axios.post<TelemetryResponse>(`${AUTH_SERVER_URL}/telemetry/offline-onboarding`, requestBody, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200 && response.data) {
        return [true, response.data, null];
      }

      return [false, null, "Invalid response from server."];
    } catch (error) {
      console.error(error);
      if (error instanceof AxiosError) {
        if (error.response?.status === 400) {
          const errorMessage = error.response.data?.error || "Invalid request. Please check your information.";
          return [false, null, errorMessage];
        }
        if (error.response?.status) {
          return [false, null, `Server error: ${error.response.status}`];
        }
        if (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
          return [false, null, "Unable to connect to server. Please check your connection."];
        }
      }
      return [false, null, "Unable to submit telemetry. Please try again."];
    }
  },

  async logout() {
    try {
      // Store previous session before clearing user data
      const currentUser = userStore.currentUser;
      if (currentUser) {
        previousSessionService.storePreviousSession(currentUser);
      }

      // Cleanup audit log service
      await auditLogService.cleanup();
      configService.clearAuditLogRemoteEnabled();

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
        serverUrl,
        username,
        loginAt: Date.now(),
        isInitialSyncComplete: false,
      };

      userStore.setUser(user);

      // Audit Log
      await auditLogService.engineInit("LoginPage");

      // Reset audit log session for new login
      auditLogService.resetSession();

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
