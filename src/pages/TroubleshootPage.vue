<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Troubleshoot</div>
      </div>

      <div class="q-pa-md control-group">
        <div class="control-title q-mb-sm">Optimize Database</div>
        <div class="text-body2 q-mb-md">
          Runs maintenance tasks to keep local data healthy and ensure required defaults exist.
        </div>

        <div v-if="isOptimizing" class="q-mb-md">
          <q-linear-progress :value="progressValue" color="primary" rounded />
          <div class="text-caption q-mt-sm">
            <b>Stage:</b> {{ optimizationProgress.stage }}
            <span class="q-ml-md"><b>Elapsed:</b> {{ elapsedLabel }}</span>
          </div>
          <div class="text-caption">
            <b>Processed:</b> {{ optimizationProgress.processedDocs }} / {{ optimizationProgress.totalDocs || "?" }}
            <span class="q-ml-md"><b>Updated:</b> {{ optimizationProgress.updatedDocs }}</span>
          </div>
        </div>

        <q-btn color="primary" icon="tune" label="Optimize Database" :loading="isOptimizing" :disable="isOptimizing"
          @click="optimizeDatabaseClicked" />
      </div>

      <div class="q-pa-md control-group">
        <div class="control-title q-mb-sm">Hard Refresh</div>
        <div class="text-body2 q-mb-md">
          If the app is behaving strangely, a hard refresh can clear stale state and reload the app from scratch.
        </div>

        <q-btn color="primary" icon="refresh" label="Hard Refresh" @click="hardRefreshClicked" />
      </div>

      <div class="q-pa-md control-group">
        <div class="control-title q-mb-sm">Emergency Service Worker & Cache Cleanup</div>
        <div class="text-body2 q-mb-md">
          <strong>Warning:</strong> This will remove all cached data and unregister all service workers. Use this only
          if you're experiencing persistent issues with updates or caching. The app will reload after cleanup.
        </div>

        <q-btn color="negative" icon="delete_forever" label="Clear All Caches & Unregister Service Workers"
          :loading="isCleaningUp" :disable="isCleaningUp" @click="emergencyCleanupClicked" />
      </div>

      <div class="q-pa-md control-group">
        <div class="control-title q-mb-sm">Remove All Local Data</div>
        <div class="text-body2 q-mb-md">
          <strong>Danger Zone:</strong> This will permanently delete ALL your local financial data including records,
          accounts, budgets, and settings. This action cannot be undone. If you have cloud sync enabled, your data will
          remain on the cloud but all local copies will be erased.
        </div>

        <q-btn color="negative" icon="delete_forever" label="Remove All Local Data" @click="removeLocalDataClicked" />
      </div>
    </q-card>

    <OptimizationSummaryDialog v-model="showSummaryDialog" :summary="optimizationSummary" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { dialogService } from "src/services/dialog-service";
import { localDataService } from "src/services/local-data-service";
import { optimizationService, type OptimizationProgress, type OptimizationSummary } from "src/services/optimization-service";
import { serviceWorkerService } from "src/services/service-worker-service";
import OptimizationSummaryDialog from "src/components/troubleshoot/OptimizationSummaryDialog.vue";

const router = useRouter();
const isOptimizing = ref(false);
const isCleaningUp = ref(false);
const showSummaryDialog = ref(false);
const optimizationSummary = ref<OptimizationSummary | null>(null);

const optimizationProgress = ref<OptimizationProgress>({
  stage: "Validating user",
  processedDocs: 0,
  totalDocs: 0,
  updatedDocs: 0,
});

const progressValue = computed(() => {
  const total = optimizationProgress.value.totalDocs;
  if (!total || total <= 0) return 0.05;
  const v = optimizationProgress.value.processedDocs / total;
  return Math.max(0.05, Math.min(1, v));
});

const startedAt = ref<number | null>(null);
const nowMs = ref(Date.now());
let timer: number | null = null;

const elapsedLabel = computed(() => {
  const start = startedAt.value;
  if (!start) return "0s";
  const ms = Math.max(0, nowMs.value - start);
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${remSeconds}s`;
});

async function optimizeDatabaseClicked() {
  isOptimizing.value = true;
  try {
    optimizationSummary.value = null;
    showSummaryDialog.value = false;
    optimizationProgress.value = { stage: "Validating user", processedDocs: 0, totalDocs: 0, updatedDocs: 0 };
    startedAt.value = Date.now();
    nowMs.value = Date.now();
    if (timer) window.clearInterval(timer);
    timer = window.setInterval(() => {
      nowMs.value = Date.now();
    }, 250);

    const summary = await optimizationService.optimizeDatabase(router, (p) => {
      optimizationProgress.value = p;
    });
    if (summary) {
      optimizationSummary.value = summary;
      showSummaryDialog.value = true;
    }
  } finally {
    isOptimizing.value = false;
    if (timer) window.clearInterval(timer);
    timer = null;
  }
}

function hardRefreshClicked() {
  console.debug("hardRefreshClicked");
  window.location.href = "/";
  // @ts-ignore
  window.location.reload(true);
}

async function emergencyCleanupClicked() {
  const confirmed = await dialogService.confirm(
    "Emergency Cleanup",
    "This will delete all cached data and unregister all service workers. The app will reload after cleanup. Are you sure you want to continue?"
  );

  if (!confirmed) {
    return;
  }

  isCleaningUp.value = true;
  try {
    await serviceWorkerService.emergencyCleanup();
    await dialogService.alert("Cleanup Complete", "All caches have been cleared and service workers unregistered. The app will now reload.");
    window.location.reload();
  } catch (error) {
    isCleaningUp.value = false;
    console.error("Error during emergency cleanup:", error);
    const message = error && error instanceof Error ? error.message : JSON.stringify(error);
    await dialogService.alert("Cleanup Error", "An error occurred during cleanup: " + message);
  }
}

function removeLocalDataClicked() {
  localDataService.removeLocalData();
}

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<style scoped lang="scss">
.control-group {
  background-color: rgb(244, 244, 244);
  margin: 12px;
  border-radius: 16px;
  transition: background-color 0.2s ease;
}

// Material 3 compliant dark mode support for control groups
body.body--dark .control-group {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.control-title {
  color: #3b3b3b;
  font-weight: 500;
  font-size: 14px;
  line-height: 20px;
}

body.body--dark .control-title {
  color: #e2e8f0;
}
</style>
