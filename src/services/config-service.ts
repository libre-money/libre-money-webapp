import { sleep } from "src/utils/misc-utils";
import { dialogService } from "./dialog-service";
import { authService } from "./auth-service";
import { DEFAULT_REMOTE_SERVER_URL } from "../constants/auth-constants";

const LOCAL_STORAGE_KEY__DOMAIN = "--ck-config--domain";
const LOCAL_STORAGE_KEY__SERVER_URL = "--ck-config--server-url";
const LOCAL_STORAGE_KEY__AUDIT_LOG_REMOTE_ENABLED = "--ck-config--audit-log-remote-enabled";

class ConfigService {
  getServerUrlAndDomainNameOrFail() {
    const domain = localStorage.getItem(LOCAL_STORAGE_KEY__DOMAIN);
    const serverUrl = localStorage.getItem(LOCAL_STORAGE_KEY__SERVER_URL);

    if (!domain || !serverUrl) {
      (async () => {
        await dialogService.alert("Critical Error", "Your login session has been corrupted. Please Login Again.");
        await authService.logout();
        await sleep(100);
        // @ts-ignore
        window.location.reload(true);
      })();

      throw new Error("CriticalError: Session Corrupted");
    }
    return { domain, serverUrl };
  }

  getDomainName() {
    return localStorage.getItem(LOCAL_STORAGE_KEY__DOMAIN);
  }

  setDomainName(domainName: string) {
    return localStorage.setItem(LOCAL_STORAGE_KEY__DOMAIN, domainName);
  }

  clearDomainName() {
    return localStorage.removeItem(LOCAL_STORAGE_KEY__DOMAIN);
  }

  getRemoteServerUrl() {
    const serverUrl = localStorage.getItem(LOCAL_STORAGE_KEY__SERVER_URL);
    return serverUrl || DEFAULT_REMOTE_SERVER_URL;
  }

  setRemoteServerUrl(serverUrl: string) {
    return localStorage.setItem(LOCAL_STORAGE_KEY__SERVER_URL, serverUrl);
  }

  clearRemoteServerUrl() {
    return localStorage.removeItem(LOCAL_STORAGE_KEY__SERVER_URL);
  }

  getAuditLogRemoteEnabled(): boolean {
    const value = localStorage.getItem(LOCAL_STORAGE_KEY__AUDIT_LOG_REMOTE_ENABLED);
    return value === "true";
  }

  setAuditLogRemoteEnabled(enabled: boolean) {
    return localStorage.setItem(LOCAL_STORAGE_KEY__AUDIT_LOG_REMOTE_ENABLED, enabled.toString());
  }

  clearAuditLogRemoteEnabled() {
    return localStorage.removeItem(LOCAL_STORAGE_KEY__AUDIT_LOG_REMOTE_ENABLED);
  }
}

export const configService = new ConfigService();
