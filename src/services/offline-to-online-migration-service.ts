import axios, { AxiosError } from "axios";
import { useUserStore } from "src/stores/user";
import { configService } from "./config-service";
import { credentialService } from "./credential-service";
import { pouchdbService } from "./pouchdb-service";
import { syncService } from "./sync-service";
import { QVueGlobals } from "quasar";

const userStore = useUserStore();

class OfflineToOnlineMigrationService {
  /**
   * Migrates an offline user to an online account by:
   * 1. Validating online credentials
   * 2. Updating user state to online
   * 3. Setting up remote configuration
   * 4. Performing initial sync to upload offline data
   */
  public async migrateOfflineUserToOnline(
    serverUrl: string,
    domain: string,
    username: string,
    password: string,
    shouldRememberPassword: boolean,
    $q: QVueGlobals
  ): Promise<[boolean, string | null]> {
    try {
      const currentUser = userStore.currentUser;

      // Ensure we have an offline user to migrate
      if (!this.canMigrateCurrentUser()) {
        return [false, "No offline user found to migrate."];
      }

      // Step 1: Validate online credentials by testing login
      const validateUrl = `${serverUrl}/${domain}/_all_docs`;
      const validateResponse = await axios.get(validateUrl, {
        auth: {
          username,
          password,
        },
      });

      if (validateResponse.status !== 200) {
        return [false, "Invalid online credentials provided."];
      }

      // Step 2: Store configuration and credentials
      configService.setRemoteServerUrl(serverUrl);
      configService.setDomainName(domain);
      await credentialService.storeCredentials(username, password, shouldRememberPassword);

      // Step 3: Update user state to online
      const onlineUser = {
        ...currentUser,
        serverUrl,
        domain,
        username,
        loginAt: Date.now(),
        isOfflineUser: false, // This is the key change
      };

      userStore.setUser(onlineUser);

      // Step 4: Perform sync to upload all offline data to the remote server
      try {
        // Sync will directly use parameters from credential service and config service
        syncService.doFullSync($q, true, "GoOnlinePage");

        // Even if there are some sync errors, we consider migration successful
        // The user can retry sync later if needed
      } catch (syncError) {
        console.error("Sync error during migration:", syncError);
        // Don't fail the migration due to sync errors
        // The user is now online and can retry sync manually
      }

      return [true, null];
    } catch (error) {
      console.error("Migration error:", error);

      // Restore offline user state if migration fails
      const currentUser = userStore.currentUser;
      if (currentUser && !currentUser.isOfflineUser) {
        const offlineUser = {
          ...currentUser,
          isOfflineUser: true,
        };
        userStore.setUser(offlineUser);
      }

      if (error instanceof AxiosError && error.code === "ERR_BAD_REQUEST") {
        return [false, "Invalid online credentials provided."];
      } else {
        console.debug(error);
        return [false, "Unable to complete migration. Please check your connection and try again."];
      }
    }
  }

  /**
   * Check if the current user can be migrated (is an offline user)
   */
  private canMigrateCurrentUser(): boolean {
    const currentUser = userStore.currentUser;
    return !!(currentUser && currentUser.isOfflineUser);
  }
}

export const offlineToOnlineMigrationService = new OfflineToOnlineMigrationService();
