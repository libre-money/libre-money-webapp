<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="">
      <q-card-section class="q-pa-lg">
        <div class="text-h4 q-mb-md">Libre Money</div>
        <div class="text-body1 text-grey-8 q-mb-sm">Finally a personal finance tracking application that makes sense.
        </div>
        <div class="text-body2 text-grey-7 q-mb-md">This Free and OpenSource Software (FOSS) is developed and maintained
          by the <a href="https://github.com/libre-money#-author--maintainer" target="_blank" class="text-primary">
            Libre Money</a> team.</div>

        <div class="text-body2 text-grey-7 q-mb-xs">
          Source Code:
          <a href="https://github.com/libre-money/libre-money-webapp" target="_blank" class="text-primary"> Under
            GPL-3.0
            license on GitHub </a>
        </div>
        <div class="text-body2 text-grey-7 q-mb-xs">
          Website:
          <a href="https://libre.money" target="_blank" class="text-primary">libre.money</a>
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

          <q-item v-if="userStore.isUserLoggedIn && userStore.currentUser?.domain">
            <q-item-section>
              <q-item-label class="text-weight-medium">Domain</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label>{{ userStore.currentUser.domain }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item v-if="updateStatus !== null">
            <q-item-section>
              <q-item-label class="text-weight-medium">Update Available</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label>
                <q-chip :color="updateStatus.updateAvailable ? 'positive' : 'grey'" text-color="white"
                  :label="updateStatus.updateAvailable ? 'Yes' : 'No'" size="sm" />
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <div v-if="!isLoading" class="q-mt-md">
          <q-btn color="secondary" text-color="white" label="Check for Updates" icon="update"
            @click="forceUpdateClicked" unelevated class="full-width" />
        </div>
      </q-card-section>

      <q-separator v-if="!isLoading" />

      <q-card-section v-if="!isLoading" class="q-pa-lg">
        <div class="text-subtitle1 q-mb-md">Legal & Privacy</div>
        <div class="row q-gutter-sm">
          <q-btn outline color="primary" label="Terms and Conditions" icon="description" @click="showTermsDialog"
            class="col" />
          <q-btn outline color="primary" label="Privacy Policy" icon="privacy_tip" @click="showPrivacyDialog"
            class="col" />
        </div>
      </q-card-section>

      <q-separator v-if="!isLoading" />

      <q-card-section v-if="!isLoading" class="q-pa-lg">
        <q-btn outline color="info" label="Home" icon="home" @click="backToHomeClicked" class="full-width" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { APP_BUILD_DATE, APP_BUILD_VERSION, APP_VERSION } from "src/constants/config-constants";
import { dialogService } from "src/services/dialog-service";
import { serviceWorkerService, type ServiceWorkerUpdateStatus } from "src/services/service-worker-service";
import { useUserStore } from "src/stores/user";
import { getCurrentYear } from "src/utils/misc-utils";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuasar } from "quasar";
import TermsAndConditionsDialog from "src/components/TermsAndConditionsDialog.vue";
import PrivacyPolicyDialog from "src/components/PrivacyPolicyDialog.vue";

const router = useRouter();
const $q = useQuasar();
const userStore = useUserStore();
const isLoading = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();
const updateStatus = ref<ServiceWorkerUpdateStatus | null>(null);

// Check for updates on mount
onMounted(async () => {
  updateStatus.value = await serviceWorkerService.checkForUpdate();
});

async function forceUpdateClicked() {
  isLoading.value = true;
  try {
    loadingIndicator.value?.startPhase({ phase: 1, weight: 100, label: "Checking for updates" });

    // Force check for updates
    const status = await serviceWorkerService.forceCheckForUpdate();
    updateStatus.value = status;

    if (!status.updateAvailable) {
      loadingIndicator.value?.startPhase({ phase: 1, weight: 100, label: "No updates available" });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await dialogService.alert("No Updates", "You are already running the latest version.");
      isLoading.value = false;
      return;
    }

    loadingIndicator.value?.startPhase({ phase: 1, weight: 100, label: "Activating update" });

    // Activate the waiting service worker
    await serviceWorkerService.activateUpdate();

    // Reload to use the new version
    window.location.reload();
  } catch (ex) {
    isLoading.value = false;
    console.warn(ex);
    const message = ex && ex instanceof Error ? ex.message : JSON.stringify(ex);
    await dialogService.alert("Update Error", "Unable to check for or to complete update. Reason: " + message);
  }
}

function backToHomeClicked() {
  router.push("/");
}

function showTermsDialog() {
  $q.dialog({
    component: TermsAndConditionsDialog,
  });
}

function showPrivacyDialog() {
  $q.dialog({
    component: PrivacyPolicyDialog,
  });
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
