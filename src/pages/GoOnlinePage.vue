<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title text-center">{{ currentView === "benefits" ? "Upgrade to Online" : "Enter Your Credentials" }}</div>
      </div>

      <q-separator />

      <!-- Benefits View -->
      <template v-if="currentView === 'benefits'">
        <div class="q-pa-md">
          <div class="text-h6 q-mb-md">Why Go Online?</div>

          <q-list class="q-mb-lg">
            <q-item>
              <q-item-section avatar>
                <q-icon name="sync" color="primary" size="24px" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">Sync Across Devices</q-item-label>
                <q-item-label caption>Access your data from any device, anywhere</q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section avatar>
                <q-icon name="backup" color="primary" size="24px" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">Automatic Backup</q-item-label>
                <q-item-label caption>Never lose your financial data again</q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section avatar>
                <q-icon name="payments" color="primary" size="24px" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">Modest and fair pricing</q-item-label>
                <q-item-label caption>No hidden fees, no upsells, no surprises</q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section avatar>
                <q-icon name="dns" color="primary" size="24px" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">Self-hosting options</q-item-label>
                <q-item-label caption>Run your own server, or use our hosted service</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <!-- Message for users who have already signed up -->
          <div v-if="userStore.currentUser?.isOfflineUser && userStore.currentUser?.hasSignedUpForCloudAccount" class="q-pa-md">
            <q-banner class="bg-green-1 text-green-9 q-mb-md" rounded>
              <template v-slot:avatar>
                <q-icon name="check_circle" color="green" size="24px" />
              </template>
              <div class="text-body1 text-weight-medium q-mb-sm">Request Submitted</div>
              <div class="text-body2">
                Your cloud account request has been submitted. You should expect an email at
                <strong>{{ userStore.currentUser?.cloudAccountEmail }}</strong> within two working days with your account details.
              </div>
            </q-banner>
          </div>

          <div class="action-buttons q-gutter-md q-pa-md">
            <q-btn
              v-if="userStore.currentUser?.isOfflineUser && !userStore.currentUser?.hasSignedUpForCloudAccount"
              unelevated
              color="positive"
              label="Sign Up for a Cloud Account"
              icon="cloud"
              @click="showCloudAccountSignup"
              class="full-width"
            />

            <q-btn outline color="secondary" label="Self-Hosting Options" icon="dns" @click="getSelfHostOptions" class="full-width" />

            <q-separator class="q-my-md" />

            <q-btn outline color="primary" label="I Already Have Credentials" icon="login" class="full-width" @click="goToCredentialsView" />
          </div>
        </div>
      </template>

      <!-- Credentials View -->
      <template v-if="currentView === 'credentials'">
        <q-form @submit="onMigrationSubmit">
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

            <div class="row justify-end q-mt-sm">
              <q-btn
                flat
                outline
                color="primary"
                :label="isSelfHosted ? 'Hide Self-hosted Options' : 'Show Self-hosted Options'"
                :icon="isSelfHosted ? 'expand_less' : 'expand_more'"
                @click="isSelfHosted = !isSelfHosted"
                :class="{ 'q-mb-md': isSelfHosted, 'q-px-sm': true }"
              />
            </div>

            <!-- Self-hosted options (shown when isSelfHosted is true) -->
            <template v-if="isSelfHosted">
              <q-input standout="bg-primary text-white" v-model="customServerUrl" label="Server URL" lazy-rules :rules="validators.url" class="local-control" />

              <q-input standout="bg-primary text-white" v-model="domain" label="Domain" lazy-rules :rules="validators.domain" class="local-control" />
            </template>

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
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { validators } from "src/utils/validators";
import { offlineToOnlineMigrationService } from "src/services/offline-to-online-migration-service";
import { dialogService, NotificationType } from "src/services/dialog-service";
import { GO_ONLINE_REGISTRATION_URL, GO_ONLINE_SELF_HOST_URL } from "src/constants/config-constants";
import { authService } from "src/services/auth-service";
import { useQuasar } from "quasar";
import { useUserStore } from "src/stores/user";
import CloudAccountSignupDialog from "src/components/CloudAccountSignupDialog.vue";

type ViewType = "benefits" | "credentials";

const router = useRouter();
const $q = useQuasar();
const userStore = useUserStore();

// State
const currentView = ref<ViewType>("benefits");
const isLoading = ref(false);

// Form fields
const isSelfHosted = ref(false);
const customServerUrl = ref<string>("");
const domain = ref<string>("");
const username = ref<string>("");
const password = ref<string>("");
const shouldRememberPassword = ref(false);

// Methods
function goToCredentialsView() {
  currentView.value = "credentials";
}

function goToBenefitsView() {
  currentView.value = "benefits";
}

function getSelfHostOptions() {
  window.open(GO_ONLINE_SELF_HOST_URL, "_blank");
}

function showCloudAccountSignup() {
  $q.dialog({
    component: CloudAccountSignupDialog,
  });
}

async function onMigrationSubmit() {
  isLoading.value = true;

  try {
    let serverUrl: string;
    let domainValue: string;
    let usernameValue: string;

    if (isSelfHosted.value) {
      // Self-hosted flow: use provided serverUrl and domain
      if (!customServerUrl.value || !domain.value) {
        await dialogService.alert("Validation Error", "Please provide both Server URL and Domain for self-hosted login.");
        isLoading.value = false;
        return;
      }
      serverUrl = customServerUrl.value;
      domainValue = domain.value;
      usernameValue = username.value;
    } else {
      // Default flow: authenticate with auth server
      if (!username.value || !password.value) {
        await dialogService.alert("Validation Error", "Please provide username and password.");
        isLoading.value = false;
        return;
      }

      const [authSuccess, authResponse, authError] = await authService.fetchAuthDetailsFromAuthServer(username.value, password.value);

      if (!authSuccess || !authResponse) {
        await dialogService.alert("Authentication Error", authError || "Unable to authenticate. Please try again.");
        isLoading.value = false;
        return;
      }

      serverUrl = authResponse.serverUrl;
      domainValue = authResponse.domain;
      usernameValue = authResponse.username;
    }

    const [successful, failureReason] = await offlineToOnlineMigrationService.migrateOfflineUserToOnline(
      serverUrl,
      domainValue,
      usernameValue,
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
