<template>
  <q-page class="row items-start justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div>
          <div class="title">Cash Keeper</div>
          <div style="margin-top: 8px">Finally a personal finance tracking application that makes sense.</div>
          <div style="margin-top: 8px">This Free and OpenSource Software (FOSS) is developed and maintained by Sayem Shafayet.</div>

          <div style="margin-top: 8px">
            Source Code: <a href="https://github.com/iShafayet/cash-keeper-client" target="_blank">Under GPL-3.0 license on GitHub</a>.
          </div>
          <div style="margin-top: 8px">2023 to {{ getCurrentYear() }} © <a href="https://ishafayet.me" target="_blank">Sayem Shafayet</a>.</div>
        </div>
      </div>

      <div class="q-pa-md control-group">
        <div class="q-pa-md" :hidden="!isLoading">
          <loading-indicator :is-loading="isLoading" :phases="1" ref="loadingIndicator"></loading-indicator>
        </div>

        <div class="control-title">Version: {{ APP_VERSION }}</div>
        <div class="control-title">Build Number: {{ APP_BUILD_VERSION }}</div>
        <div class="control-title">Build Date: {{ APP_BUILD_DATE }}</div>

        <div style="margin-top: 12px" :hidden="isLoading">
          <q-btn color="secondary" text-color="white" label="Check for Updates" @click="forceUpdateClicked" />
        </div>
      </div>

      <div :hidden="isLoading" class="q-pa-md" style="display: flex; justify-content: end">
        <q-btn color="grey-7" text-color="white" label="Back to Home" @click="backToHomeClicked" />
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { APP_BUILD_DATE, APP_BUILD_VERSION, APP_VERSION } from "src/constants/config-constants";
import { dialogService } from "src/services/dialog-service";
import { getCurrentYear, sleep } from "src/utils/misc-utils";
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const isLoading = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

async function forceUpdateClicked() {
  isLoading.value = true;
  try {
    loadingIndicator.value?.startPhase({ phase: 1, weight: 100, label: "Checking for updates" });

    for (const key of await caches.keys()) {
      await caches.delete(key);
    }

    const regList = await navigator.serviceWorker.getRegistrations();
    for (const reg of regList) {
      console.debug(reg);
      await reg.update();
    }

    await sleep(1000);
    // @ts-ignore
    window.location.reload(true);
  } catch (ex) {
    console.warn(ex);
    const message = ex && ex instanceof Error ? ex.message : JSON.stringify(ex);
    await dialogService.alert("Update Error", "Unable to check for or to complete update. Reason: " + message);
  }
  isLoading.value = false;
}

function backToHomeClicked() {
  router.push("/");
}
</script>

<style scoped lang="scss">
.local-control {
  max-width: 260px;
}

.control-group {
  background-color: rgb(244, 244, 244);
  margin: 12px;
}

.control-toggle {
  display: flex;
  justify-content: start;
  width: calc(100% - 16px);
  max-width: 300px;
  color: #3b3b3b;
}

.control-title {
  color: #3b3b3b;
}
</style>
