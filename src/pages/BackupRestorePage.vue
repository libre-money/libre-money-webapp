<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Backup &amp; Restore</div>
      </div>

      <div class="q-pa-md">
        <div class="text-subtitle1 q-mb-sm">Backup</div>
        <div class="text-body2 q-mb-md">
          Create a backup file containing all your data. Save this file in a safe place so you can restore it later if
          needed.
        </div>

        <q-btn color="primary" icon="download" label="Download Backup" :loading="isExporting" :disable="isBusy"
          @click="downloadBackupClicked" />
      </div>

      <q-separator class="q-my-md" />

      <div class="q-pa-md">
        <div class="text-subtitle1 q-mb-sm">Restore</div>
        <div class="text-body2 q-mb-md">
          Restore your data from a previously saved backup file. This will add or update your data from the backup.
        </div>
        <q-banner dense class="bg-orange-1 text-orange-10 q-mt-sm q-mb-md">
          <b>Important:</b> Restoring from a backup will not delete any existing data. If your backup came from a
          different device or account, you may see duplicate items (like currencies or tags).
        </q-banner>

        <div class="q-col-gutter-md items-end">
          <div class="col-12 col-sm-8">
            <q-file v-model="restoreFile" accept=".json,application/json" outlined label="Select backup file"
              :disable="isBusy" />
          </div>
          <div class="col-12 col-sm-4">
            <q-btn color="negative" icon="restore" label="Restore from Backup" class="full-width" :loading="isRestoring"
              :disable="isBusy || !restoreFile" @click="restoreClicked" />
          </div>
        </div>

        <div v-if="isRestoring" class="q-mt-md">
          <q-linear-progress :value="restoreProgressValue" color="primary" rounded />
          <div class="text-caption q-mt-sm">
            Restoring... {{ restoreProgress.processed }} of {{ restoreProgress.total || "?" }} items
          </div>
        </div>

        <q-separator class="q-my-md" />

        <div class="text-caption">
          <b>Tip:</b> For safety, run this on a single device at a time.
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Notify } from "quasar";
import { dialogService } from "src/services/dialog-service";
import { dataBackupService } from "src/services/data-backup-service";
import { syncService } from "src/services/sync-service";

const isExporting = ref(false);
const isRestoring = ref(false);
const restoreFile = ref<File | null>(null);

const restoreProgress = ref<{ processed: number; total: number; }>({ processed: 0, total: 0 });
const restoreProgressValue = computed(() => {
  const total = restoreProgress.value.total;
  if (!total || total <= 0) return 0.05;
  const v = restoreProgress.value.processed / total;
  return Math.max(0.05, Math.min(1, v));
});

const isBusy = computed(() => isExporting.value || isRestoring.value);

async function downloadBackupClicked() {
  isExporting.value = true;
  try {
    const jsonData = await dataBackupService.exportAllDataToJson();
    await dataBackupService.initiateFileDownload(jsonData);
    Notify.create({ type: "positive", message: "Backup downloaded." });
  } catch (ex) {
    Notify.create({ type: "negative", message: ex instanceof Error ? ex.message : String(ex) });
  } finally {
    isExporting.value = false;
  }
}

async function readFileAsText(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });
}

async function restoreClicked() {
  if (!restoreFile.value) {
    Notify.create({ type: "negative", message: "Please select a backup file." });
    return;
  }

  const confirmed = await dialogService.confirm(
    "Restore from Backup",
    "This will restore your data from the selected backup file. Sync will be temporarily paused during the restore. Continue?"
  );
  if (!confirmed) return;

  isRestoring.value = true;
  restoreProgress.value = { processed: 0, total: 0 };

  try {
    syncService.setBackgroundSyncEnabled(false);

    const text = await readFileAsText(restoreFile.value);
    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("Invalid backup file. Please make sure you selected a valid backup file.");
    }

    const result = await dataBackupService.restoreAllDataFromPayload(payload, (p) => {
      restoreProgress.value = p;
    });

    const addedCount = result.created;
    const updatedCount = result.updated;
    let message = "Restore completed successfully.";
    if (addedCount > 0 || updatedCount > 0) {
      const parts: string[] = [];
      if (addedCount > 0) parts.push(`${addedCount} added`);
      if (updatedCount > 0) parts.push(`${updatedCount} updated`);
      message = `Restore completed. ${parts.join(", ")}.`;
    }
    Notify.create({
      type: "positive",
      message,
    });
  } catch (ex) {
    Notify.create({ type: "negative", message: ex instanceof Error ? ex.message : String(ex) });
  } finally {
    syncService.setBackgroundSyncEnabled(true);
    isRestoring.value = false;
  }
}
</script>
