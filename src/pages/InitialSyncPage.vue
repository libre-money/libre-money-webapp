<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="sync-card">
      <q-card-section class="text-center q-pa-xl">
        <!-- Loading State -->
        <template v-if="syncState === 'syncing'">
          <q-spinner color="primary" size="64px" :thickness="4" class="q-mb-md" />
          <div class="text-h5 q-mb-sm">Initial Sync in Progress</div>
          <div class="text-body1 text-grey-7 q-mb-lg">
            Please wait while we synchronize your data. This may take a few moments.
          </div>
          <div v-if="syncStatus" class="text-body2 text-grey-6">
            {{ syncStatus }}
          </div>
        </template>

        <!-- Success State -->
        <template v-else-if="syncState === 'success'">
          <q-icon name="check_circle" color="positive" size="64px" class="q-mb-md" />
          <div class="text-h5 q-mb-sm">Sync Completed Successfully</div>
          <div class="text-body1 text-grey-7 q-mb-lg">
            Your data has been synchronized. Redirecting...
          </div>
        </template>

        <!-- Error State -->
        <template v-else-if="syncState === 'error'">
          <q-icon name="error" color="negative" size="64px" class="q-mb-md" />
          <div class="text-h5 q-mb-sm">Sync Failed</div>
          <div class="text-body1 text-grey-7 q-mb-lg">
            {{ syncStatus || "Unable to synchronize your data. Please check your connection and try again." }}
          </div>
          <div class="q-gutter-sm q-mt-md">
            <q-btn unelevated color="primary" label="Retry Sync" @click="performInitialSync" :loading="isRetrying" />
            <q-btn outline color="grey" label="Logout" @click="handleLogout" :disable="isRetrying" />
          </div>
        </template>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { syncService } from "src/services/sync-service";
import { useUserStore } from "src/stores/user";
import { authService } from "src/services/auth-service";
import { dialogService } from "src/services/dialog-service";

const $q = useQuasar();
const router = useRouter();
const userStore = useUserStore();

type SyncState = "idle" | "syncing" | "success" | "error";

const syncState = ref<SyncState>("idle");
const syncStatus = ref<string | null>(null);
const isRetrying = ref(false);

async function performInitialSync() {
  try {
    const wasError = syncState.value === "error";
    syncState.value = "syncing";
    syncStatus.value = "Connecting to server...";
    isRetrying.value = wasError; // Set to true if retrying from error state

    // Perform full sync without reloading the window
    // The SyncDialog will set isInitialSyncComplete when sync completes
    // The watcher will detect the completion and update the state
    await syncService.doFullSync($q, false, "InitialSyncPage");

    // Wait a bit to see if sync completed successfully
    // If the watcher hasn't detected completion after a reasonable time, check manually
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (syncState.value === "syncing") {
      // Still syncing or sync completed but flag not set - check user state
      if (!userStore.currentUser?.isInitialSyncComplete) {
        syncState.value = "error";
        syncStatus.value = "Sync completed but verification failed. Please try again.";
        isRetrying.value = false;
      }
    }
  } catch (error) {
    console.error("Initial sync error:", error);
    syncState.value = "error";
    syncStatus.value = error instanceof Error ? error.message : "Sync failed. Please try again.";
    isRetrying.value = false;
  }
}

async function handleLogout() {
  try {
    const [successful, failureReason] = await authService.logout();
    if (!successful) {
      await dialogService.alert("Logout Error", failureReason as string);
      return;
    }
    // Navigate to post-logout page
    await router.push({ name: "post-logout" });
  } catch (error) {
    console.error("Logout error:", error);
    await dialogService.alert("Logout Error", "An unexpected error occurred during logout.");
  }
}

// Watch for sync completion
watch(
  () => syncService.status.value.isFullSyncing,
  (isSyncing) => {
    if (syncState.value === "syncing") {
      if (isSyncing && syncStatus.value === "Connecting to server...") {
        syncStatus.value = "Synchronizing data...";
      } else if (!isSyncing && syncStatus.value === "Synchronizing data...") {
        syncStatus.value = "Finalizing...";
      }
    }
  }
);

// Watch for sync completion by checking user state
watch(
  () => userStore.currentUser?.isInitialSyncComplete,
  (isComplete) => {
    if (isComplete && syncState.value === "syncing") {
      syncState.value = "success";
      syncStatus.value = "Sync completed! Redirecting...";
      setTimeout(() => {
        router.push({ name: "overview" });
      }, 1000);
    }
  }
);

onMounted(() => {
  // Only perform sync if not already complete
  if (userStore.currentUser && !userStore.currentUser.isInitialSyncComplete) {
    performInitialSync();
  } else if (userStore.currentUser?.isInitialSyncComplete) {
    // Already synced, redirect immediately
    router.push({ name: "overview" });
  }
});
</script>

<style scoped lang="scss">
.sync-card {
  min-width: 300px;
  max-width: 500px;
  width: 100%;
  margin: 12px;
}
</style>
