<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="">
      <q-card-section class="q-pa-lg">
        <div class="text-h4 q-mb-md">Libre Money</div>
        <div class="text-body1 text-grey-8 q-mb-sm">Finally a personal finance tracking application that makes sense.</div>
        <div class="text-body2 text-grey-7 q-mb-md">This Free and OpenSource Software (FOSS) is developed and maintained by Sayem Shafayet.</div>

        <div class="text-body2 text-grey-7 q-mb-xs">
          Source Code:
          <a href="https://github.com/iShafayet/cash-keeper-client" target="_blank" class="text-primary"> Under GPL-3.0 license on GitHub </a>
        </div>
        <div class="text-body2 text-grey-7">
          2023 to {{ getCurrentYear() }} ©
          <a href="https://ishafayet.me" target="_blank" class="text-primary">Sayem Shafayet</a>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-lg">
        <div v-if="isLoading" class="q-mb-md">
          <loading-indicator :is-loading="isLoading" :phases="1" ref="loadingIndicator"></loading-indicator>
        </div>

        <q-list class="rounded-borders" separator bordered>
          <q-item>
            <q-item-section>
              <q-item-label class="text-weight-medium">Version</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label>{{ APP_VERSION }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section>
              <q-item-label class="text-weight-medium">Build Number</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label>{{ APP_BUILD_VERSION }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section>
              <q-item-label class="text-weight-medium">Build Date</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label>{{ APP_BUILD_DATE }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <div v-if="!isLoading" class="q-mt-md">
          <q-btn color="secondary" text-color="white" label="Check for Updates" icon="update" @click="forceUpdateClicked" unelevated class="full-width" />
        </div>
      </q-card-section>

      <q-separator v-if="!isLoading" />

      <q-card-section v-if="!isLoading" class="q-pa-lg">
        <div class="row q-gutter-sm">
          <q-btn color="negative" label="Remove Local Data" icon="delete_forever" @click="removeLocalDataClicked" class="col" />
          <q-btn outline color="info" label="Home" icon="home" @click="backToHomeClicked" class="col" />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { APP_BUILD_DATE, APP_BUILD_VERSION, APP_VERSION } from "src/constants/config-constants";
import { dialogService } from "src/services/dialog-service";
import { localDataService } from "src/services/local-data-service";
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
    isLoading.value = false;
    console.warn(ex);
    const message = ex && ex instanceof Error ? ex.message : JSON.stringify(ex);
    await dialogService.alert("Update Error", "Unable to check for or to complete update. Reason: " + message);
  }
}

function removeLocalDataClicked() {
  localDataService.removeLocalData();
}

function backToHomeClicked() {
  router.push("/");
}
</script>

<style scoped lang="scss">
a {
  text-decoration: none;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
    text-decoration: underline;
  }
}
</style>
