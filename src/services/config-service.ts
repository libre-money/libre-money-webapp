import { sleep } from "src/utils/misc-utils";
import { dialogService } from "./dialog-service";
import { loginService } from "./login-service";

const REMOTE_SERVER_URL = "https://homeserver.cashkeeper.space";
const LOCAL_STORAGE_KEY__DOMAIN = "--ck-config--domain";

class ConfigService {
  getDomainName(mandatory = true) {
    const domain = localStorage.getItem(LOCAL_STORAGE_KEY__DOMAIN);
    if (mandatory && !domain) {
      (async () => {
        await dialogService.alert("Critical Error", "Your login session has been corrupted. Please Login Again.");
        await loginService.logout();
        await sleep(100);
        // @ts-ignore
        window.location.reload(true);
      })();

      throw new Error("CriticalError: Session Corrupted");
    }
    return domain;
  }

  setDomainName(domainName: string) {
    return localStorage.setItem(LOCAL_STORAGE_KEY__DOMAIN, domainName);
  }

  getRemoteServerUrl() {
    return REMOTE_SERVER_URL;
  }
}

export const configService = new ConfigService();
