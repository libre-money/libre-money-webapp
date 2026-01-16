import { dialogService } from "./dialog-service";
import { authService } from "./auth-service";
import { pouchdbService } from "./pouchdb-service";

class LocalDataService {
  async removeLocalData(promptUser = true, reloadWindow = true, targetPath = "") {
    if (promptUser) {
      const answer = await dialogService.confirm(
        "Remove Local Data",
        "Are you sure you want to remove all local data? Any un-synced data will be lost forever."
      );
      if (!answer) return;
    }

    try {
      await pouchdbService.getDb().destroy();
    } catch (error) {
      console.error(error);
    }

    pouchdbService.reinitializePouchdb();

    try {
      await authService.logout();
    } catch (error) {
      console.error(error);
    }

    localStorage.clear();
    sessionStorage.clear();

    window.location.hash = targetPath || "";

    if (reloadWindow) {
      // @ts-ignore
      window.location.reload(true);
    }
  }
}

export const localDataService = new LocalDataService();
