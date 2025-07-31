<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="sync-dialog-card">
      <!-- Header Section -->
      <q-card-section class="sync-header">
        <div class="row items-center q-mb-md q-pb-md">
          <q-icon name="sync" size="32px" color="primary" class="q-mr-md" />
          <div>
            <div class="text-h6 text-weight-medium">{{ dialogTitle }}</div>
            <div class="text-caption text-grey-7">{{ dialogSubtitle }}</div>
          </div>
        </div>
      </q-card-section>

      <!-- Content Section -->
      <q-card-section class="sync-content">
        <!-- Welcome Message for New Users -->
        <div v-if="showWelcomeMessage" class="welcome-section q-mb-lg">
          <q-banner class="bg-blue-1 text-blue-9">
            <template v-slot:avatar>
              <q-icon name="info" color="blue" />
            </template>
            <div class="text-body2">
              {{ welcomeMessage }}
            </div>
          </q-banner>
        </div>

        <!-- Sync Progress -->
        <div v-if="!needsPasswordInput" class="sync-progress">
          <div class="text-center q-mb-md">
            <q-spinner-dots color="primary" size="48px" />
          </div>

          <div class="sync-status text-center">
            <div class="text-body1 q-mb-sm">{{ syncStatusMessage }}</div>
            <div class="text-caption text-grey-6">{{ syncDetailMessage }}</div>
          </div>

          <q-linear-progress :indeterminate="true" color="primary" class="q-mt-md" rounded />
        </div>

        <!-- Password Input Form -->
        <div v-if="needsPasswordInput" class="password-section">
          <q-banner class="bg-orange-1 text-orange-9 q-mb-md" style="margin-bottom: 36px">
            <template v-slot:avatar>
              <q-icon name="lock" color="orange" />
            </template>
            <div class="text-body2">Your session has expired. Please re-enter your password to continue syncing.</div>
          </q-banner>

          <q-form @submit="onSubmit" class="q-gutter-md">
            <q-input
              type="password"
              filled
              v-model="password"
              :label="`Password for ${username}`"
              placeholder="Enter your password"
              lazy-rules
              :rules="validators.password"
              autofocus
            >
              <template v-slot:prepend>
                <q-icon name="lock" />
              </template>
            </q-input>
          </q-form>
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions class="sync-actions">
        <q-btn flat label="Cancel" color="grey-7" @click="cancelClicked" class="q-mr-sm" />
        <q-spacer />
        <q-btn v-if="needsPasswordInput" unelevated label="Continue" color="primary" @click="onSubmit" icon="sync" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar";
import { authService } from "src/services/auth-service";
import { credentialService } from "src/services/credential-service";
import { dialogService } from "src/services/dialog-service";
import { migrationService } from "src/services/migration-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { useUserStore } from "src/stores/user";
import { sleep } from "src/utils/misc-utils";
import { validators } from "src/utils/validators";
import { Ref, ref, computed } from "vue";

export default {
  props: {
    bidirectional: {
      type: Boolean,
      required: false,
      default: true,
    },
    reloadWindowAfterSync: {
      type: Boolean,
      required: false,
      default: true,
    },
    invocationOrigin: {
      type: String,
      required: false,
      default: "unknown",
    },
  },

  components: {},

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const userStore = useUserStore();
    const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent();
    const $q = useQuasar();

    // Reactive state
    const needsPasswordInput = ref(false);
    const username: Ref<string | null> = ref(null);
    const password: Ref<string | null> = ref(null);
    const syncStatusMessage = ref("Initializing sync...");
    const syncDetailMessage = ref("Please wait while we prepare your data");
    const isLoading = ref(false);

    // Computed properties for contextual messaging
    const dialogTitle = computed(() => {
      switch (props.invocationOrigin) {
        case "LoginPage":
          return "Welcome to Cash Keeper";
        case "MainLayout":
          return "Syncing Data";
        default:
          return "Syncing Data";
      }
    });

    const dialogSubtitle = computed(() => {
      switch (props.invocationOrigin) {
        case "LoginPage":
          return "Setting up your account and syncing your data";
        case "MainLayout":
          return "Please wait while we sync your data";
        default:
          return "Please wait while we sync your data";
      }
    });

    const showWelcomeMessage = computed(() => {
      return props.invocationOrigin === "LoginPage";
    });

    const welcomeMessage = computed(() => {
      switch (props.invocationOrigin) {
        case "LoginPage":
          return "We're setting up your account and downloading your data from the server. This may take a few moments.";
        default:
          return "";
      }
    });

    // Sync logic with better status updates
    async function updateSyncStatus(message: string, detail = "") {
      syncStatusMessage.value = message;
      syncDetailMessage.value = detail;
    }

    async function sync() {
      needsPasswordInput.value = false;

      // Check credentials
      if (!credentialService.hasCredentials()) {
        if (!userStore.isUserLoggedIn) {
          window.location.reload();
          return;
        }
        username.value = userStore.currentUser!.username;
        needsPasswordInput.value = true;
        console.debug("Asking user to input password again");
        return;
      }

      try {
        await updateSyncStatus("Connecting to server...", "Establishing secure connection");

        await updateSyncStatus("Synchronizing data...", "This may take a few moments depending on the size of your data");
        let errorCount = (await pouchdbService.sync()) as number;

        if (errorCount > 0) {
          await updateSyncStatus("Sync completed with warnings", `${errorCount} non-fatal errors occurred`);
          await dialogService.alert("Sync Ended", `Sync ended with ${errorCount} non-fatal errors. Please inform administrator to avoid data loss.`);
        } else {
          await updateSyncStatus("Finalizing setup...", "Running post-sync operations");
        }

        await migrationService.migrateDefaultExpenseAvenueAndIncomeSource($q);
        await sleep(500);
        await updateSyncStatus("Complete!", "Your data is now up to date");

        if (props.reloadWindowAfterSync) {
          await sleep(1000);
          window.location.reload();
        } else {
          onDialogCancel();
        }
      } catch (error) {
        console.error("Sync error:", error);
        await updateSyncStatus("Sync failed", "Please check your internet connection");
        await dialogService.alert("Sync Error", "Encountered error while trying to sync with remote. Ensure you have working internet connection");
      }
    }

    async function onSubmit() {
      isLoading.value = true;
      let [successful, failureReason] = await authService.updateAndTestCredentials(username.value!, password.value!);

      if (!successful) {
        isLoading.value = false;
        await dialogService.alert("Credentials Error", failureReason as string);
        return;
      }

      console.debug("Loaded new credentials. Reinitating sync.");
      isLoading.value = false;
      await sync();
    }

    // Start sync process
    sync();

    return {
      dialogRef,
      onDialogHide,
      cancelClicked: onDialogCancel,
      validators,
      username,
      password,
      onSubmit,
      needsPasswordInput,
      syncStatusMessage,
      syncDetailMessage,
      dialogTitle,
      dialogSubtitle,
      showWelcomeMessage,
      welcomeMessage,
      isLoading,
    };
  },
};
</script>
<style scoped lang="scss">
.sync-dialog-card {
  min-width: 480px;
  max-width: 500px;
  border-radius: 2px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.sync-header {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px 12px 0 0;
  padding-bottom: 0;
}

.sync-content {
  padding: 24px;
  min-height: 200px;
}

.welcome-section {
  .q-banner {
    border-radius: 8px;
    border-left: 4px solid var(--q-primary);
  }
}

.sync-progress {
  .sync-status {
    margin: 16px 0;

    .text-body1 {
      font-weight: 500;
      color: var(--q-dark);
    }
  }

  .q-linear-progress {
    height: 6px;
  }
}

.password-section {
  .q-banner {
    border-radius: 8px;
    border-left: 4px solid var(--q-orange);
  }

  .q-input {
    margin-top: 16px;
  }
}

.sync-actions {
  padding: 16px 24px;
  background-color: #f8f9fa;
  border-radius: 0 0 12px 12px;

  .q-btn {
    padding: 8px 24px;
    font-weight: 500;

    &[flat] {
      color: var(--q-grey-7);
    }
  }
}

// Animations for spinner
.q-spinner-dots {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}

// Responsive design
@media (max-width: 500px) {
  .sync-dialog-card {
    min-width: 300px;
    margin: 16px;
  }

  .sync-content {
    padding: 16px;
  }
}
</style>
