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
    </q-card>

    <OptimizationSummaryDialog v-model="showSummaryDialog" :summary="optimizationSummary" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { optimizationService, type OptimizationProgress, type OptimizationSummary } from "src/services/optimization-service";
import OptimizationSummaryDialog from "src/components/troubleshoot/OptimizationSummaryDialog.vue";

const router = useRouter();
const isOptimizing = ref(false);
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
