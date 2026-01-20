<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Backup &amp; Restore</div>

    <q-card flat bordered class="q-pa-md q-mb-md">
      <div class="text-subtitle1 q-mb-sm">Backup (Export)</div>
      <div class="text-body2 q-mb-md">
        Downloads a JSON backup containing <b>all documents</b> in your local database.
      </div>

      <q-btn color="primary" icon="download" label="Download Backup JSON" :loading="isExporting" :disable="isBusy"
        @click="downloadBackupClicked" />
    </q-card>

    <q-card flat bordered class="q-pa-md">
      <div class="text-subtitle1 q-mb-sm">Restore (Import)</div>
      <div class="text-body2 q-mb-md">
        Restores documents from a backup JSON. This process:
        <ul class="q-mt-sm q-mb-sm">
          <li>Disables background sync while running, and re-enables it at the end</li>
          <li>Ignores <code>_rev</code> from the backup</li>
          <li>Only updates a document when any property differs (no blind overwrite)</li>
          <li>Does <b>not</b> delete documents that are not present in the backup</li>
        </ul>
        <q-banner dense class="bg-orange-1 text-orange-10 q-mt-sm">
          Keeping docs that aren’t in the backup can lead to duplicates (for example, duplicate currencies/tags) if your
          backup came from a different device or profile.
        </q-banner>
      </div>

      <div class="q-col-gutter-md items-end">
        <div class="col-12 col-sm-8">
          <q-file v-model="restoreFile" accept=".json,application/json" outlined label="Select backup JSON file"
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
          <b>Processed:</b> {{ restoreProgress.processed }} / {{ restoreProgress.total || "?" }}
        </div>
      </div>

      <q-separator class="q-my-md" />

      <div class="text-caption">
        <b>Tip:</b> For safety, run this on a single device at a time.
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
    Notify.create({ type: "negative", message: "Please select a backup JSON file." });
    return;
  }

  const confirmed = await dialogService.confirm(
    "Restore from Backup",
    "This will import documents from the selected backup JSON into your local database. Background sync will be temporarily disabled. Continue?"
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
      throw new Error("Invalid JSON file.");
    }

    const result = await dataBackupService.restoreAllDataFromPayload(payload, (p) => {
      restoreProgress.value = p;
    });

    Notify.create({
      type: "positive",
      message: `Restore completed. Created: ${result.created}, Updated: ${result.updated}, Skipped: ${result.skipped}, Invalid: ${result.invalid}`,
    });
  } catch (ex) {
    Notify.create({ type: "negative", message: ex instanceof Error ? ex.message : String(ex) });
  } finally {
    syncService.setBackgroundSyncEnabled(true);
    isRestoring.value = false;
  }
}
</script>
