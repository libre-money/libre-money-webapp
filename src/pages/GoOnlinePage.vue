<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">{{ currentView === "benefits" ? "Upgrade to Online" : "Enter Your Credentials" }}</div>
      </div>

      <!-- Benefits View -->
      <template v-if="currentView === 'benefits'">
        <div class="q-pa-md">
          <div class="text-h6 q-mb-md text-center">Why Go Online?</div>

          <div class="benefits-list q-mb-lg">
            <div class="benefit-item">
              <q-icon name="sync" color="primary" size="24px" />
              <div class="benefit-text">
                <div class="benefit-title">Sync Across Devices</div>
                <div class="benefit-description">Access your data from any device, anywhere</div>
              </div>
            </div>

            <div class="benefit-item">
              <q-icon name="backup" color="primary" size="24px" />
              <div class="benefit-text">
                <div class="benefit-title">Automatic Backup</div>
                <div class="benefit-description">Never lose your financial data again</div>
              </div>
            </div>

            <div class="benefit-item">
              <q-icon name="payments" color="primary" size="24px" />
              <div class="benefit-text">
                <div class="benefit-title">Modest and fair pricing</div>
                <div class="benefit-description">No hidden fees, no upsells, no surprises</div>
              </div>
            </div>

            <div class="benefit-item">
              <q-icon name="dns" color="primary" size="24px" />
              <div class="benefit-text">
                <div class="benefit-title">Self-hosting options</div>
                <div class="benefit-description">Run your own server, or use our hosted service</div>
              </div>
            </div>
          </div>

          <div class="action-buttons q-gutter-md">
            <q-btn
              unelevated
              color="primary"
              label="Get Online Credentials"
              icon="cloud_upload"
              @click="getOnlineCredentials"
              style="width: calc(100% - 16px); margin-left: 16px; margin-right: 16px"
            />

            <q-btn
              outline
              color="secondary"
              label="Self-Host Options"
              icon="dns"
              @click="getSelfHostOptions"
              style="width: calc(100% - 16px); margin-left: 16px; margin-right: 16px"
            />

            <q-separator class="q-my-md" />

            <q-btn flat color="primary" label="I Already Have Credentials" icon="login" class="full-width" @click="goToCredentialsView" />
          </div>
        </div>
      </template>

      <!-- Credentials View -->
      <template v-if="currentView === 'credentials'">
        <q-form @submit="onMigrationSubmit">
          <div class="q-pa-md control-group">
            <div class="control-title">Select your server and domain</div>
            <q-select
              standout="bg-primary text-white"
              v-model="selectedServer"
              :options="serverOptions"
              label="Select Server"
              lazy-rules
              :rules="[(val) => !!val || 'Please select a server']"
              class="local-control"
            />

            <!-- Custom Server URL input (only for Self Hosted) -->
            <q-input
              v-if="selectedServer?.value === 'self-hosted'"
              filled
              v-model="customServerUrl"
              label="Server URL"
              lazy-rules
              :rules="validators.url"
              class="local-control"
            />

            <!-- Domain input -->
            <q-input standout="bg-primary text-white" v-model="domain" label="Domain" lazy-rules :rules="validators.domain" class="local-control" />
          </div>

          <div class="q-pa-md control-group">
            <div class="control-title">Enter your login credentials</div>
            <!-- Username input -->
            <q-input standout="bg-primary text-white" v-model="username" label="Username" lazy-rules :rules="validators.username" class="local-control" />

            <!-- Password input -->
            <q-input
              type="password"
              standout="bg-primary text-white"
              v-model="password"
              label="Password"
              lazy-rules
              :rules="validators.password"
              class="local-control"
            />

            <q-checkbox v-model="shouldRememberPassword" label="Store password on this device" class="q-mt-md" />
          </div>

          <div class="q-pa-md">
            <div class="row q-gutter-sm">
              <q-btn label="Back" type="button" color="grey" flat @click="goToBenefitsView" />
              <div class="spacer"></div>
              <q-btn label="Migrate to Online" type="submit" color="primary" :loading="isLoading" icon="cloud_sync" />
            </div>
          </div>
        </q-form>
      </template>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { validators } from "src/utils/validators";
import { serverOptions, DEFAULT_REMOTE_SERVER_URL, ServerOption } from "src/constants/auth-constants";
import { offlineToOnlineMigrationService } from "src/services/offline-to-online-migration-service";
import { dialogService, NotificationType } from "src/services/dialog-service";
import { GO_ONLINE_REGISTRATION_URL, GO_ONLINE_SELF_HOST_URL } from "src/constants/config-constants";
import { useQuasar } from "quasar";

type ViewType = "benefits" | "credentials";

const router = useRouter();
const $q = useQuasar();

// State
const currentView = ref<ViewType>("benefits");
const isLoading = ref(false);

// Form fields
const selectedServer = ref<ServerOption | null>(serverOptions[0]);
const customServerUrl = ref<string>("");
const domain = ref<string>("");
const username = ref<string>("");
const password = ref<string>("");
const shouldRememberPassword = ref(false);

// Computed
const displayServerUrl = computed(() => {
  if (selectedServer.value?.value === "self-hosted") {
    return customServerUrl.value || "";
  }
  return DEFAULT_REMOTE_SERVER_URL;
});

// Methods
function goToCredentialsView() {
  currentView.value = "credentials";
}

function goToBenefitsView() {
  currentView.value = "benefits";
}

function getOnlineCredentials() {
  window.open(GO_ONLINE_REGISTRATION_URL, "_blank");
}

function getSelfHostOptions() {
  window.open(GO_ONLINE_SELF_HOST_URL, "_blank");
}

async function onMigrationSubmit() {
  isLoading.value = true;

  try {
    const [successful, failureReason] = await offlineToOnlineMigrationService.migrateOfflineUserToOnline(
      displayServerUrl.value,
      domain.value,
      username.value,
      password.value,
      shouldRememberPassword.value,
      $q
    );

    if (!successful) {
      await dialogService.alert("Migration Error", String(failureReason));
      return;
    }

    dialogService.notify(NotificationType.SUCCESS, "Successfully migrated to online account!");

    await router.push({ name: "overview" });
  } catch (error) {
    console.error("Migration error:", error);
    await dialogService.alert("Migration Error", "An unexpected error occurred during migration. Please try again.");
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped lang="scss">
.benefits-list {
  .benefit-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16px;
    padding: 12px;
    background-color: #f8f9fa;
    border-radius: 8px;

    .q-icon {
      margin-right: 12px;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .benefit-text {
      .benefit-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .benefit-description {
        font-size: 13px;
        color: #666;
        line-height: 1.4;
      }
    }
  }
}

.action-buttons {
  .q-btn {
    font-weight: 500;
  }
}

.control-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
