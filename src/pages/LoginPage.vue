<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="login-card">
      <div class="app-name q-pa-xs"><img class="logo" src="icons/logo.png" alt="LM" />Libre Money</div>
      <div class="title q-pa-xs">{{ loginPageMode === "resume" ? "Welcome Back" : currentStep === 1 ? "Select Server" : "Login" }}</div>

      <!-- login page mode : login - START -->
      <template v-if="loginPageMode === 'login'">
        <!-- Step 1: Server Selection -->
        <q-form v-if="currentStep === 1" ref="serverForm" @submit="onServerSelectionStepComplete" class="q-gutter-md q-pa-md">
          <q-select
            standout="bg-primary text-white"
            v-model="selectedServer"
            :options="serverOptions"
            label="Select Server"
            lazy-rules
            :rules="[(val) => !!val || 'Please select a server']"
          />

          <!-- Custom Server URL input (only for Self Hosted) -->
          <q-input
            v-if="selectedServer?.value === 'self-hosted'"
            standout="bg-primary text-white"
            v-model="customServerUrl"
            label="Server URL"
            lazy-rules
            :rules="validators.url"
          />

          <!-- Domain input -->
          <q-input standout="bg-primary text-white" v-model="domain" label="Domain" lazy-rules :rules="validators.domain" />

          <div class="row justify-end">
            <q-btn label="Reset Local Data" type="button" color="grey" outline @click="removeLocalDataClicked" />
            <div class="spacer"></div>
            <q-btn label="Next" type="submit" color="primary" />
          </div>
        </q-form>

        <!-- Offline Trial Option -->
        <q-card-section v-if="currentStep === 1" class="offline-trial-section">
          <q-separator class="q-mb-md" />

          <div class="text-center q-mb-md">
            <div class="text-h6 q-mb-sm">Try Offline</div>
            <div class="text-body2 text-grey-7">Start using Libre Money immediately with unlimited offline access</div>
          </div>

          <q-btn unelevated color="secondary" label="Start Your Journey" icon="offline_bolt" class="full-width" @click="startOfflineSession" />
        </q-card-section>

        <!-- Step 2: Username & Password -->
        <q-form v-if="currentStep === 2" ref="loginForm" @submit="onLoginSubmit" class="q-gutter-md q-pa-md">
          <!-- Server info display -->
          <q-banner class="bg-grey-2 text-dark q-mb-md">
            <div class="text-subtitle2">Server: {{ selectedServer?.label }}</div>
            <div class="text-caption">{{ displayServerUrl }}</div>
            <div class="text-caption">Domain: {{ domain }}</div>
          </q-banner>

          <q-input standout="bg-primary text-white" v-model="username" label="Username" lazy-rules :rules="validators.username" />

          <q-input type="password" standout="bg-primary text-white" v-model="password" label="Password" lazy-rules :rules="validators.password" />

          <q-checkbox v-model="shouldRememberPassword" label="Store password on this device" />

          <div class="row">
            <q-btn label="Back" type="button" color="grey" flat @click="goBackToServerSelection" />
            <div class="spacer"></div>
            <q-btn label="Login" type="submit" color="primary" :loading="isLoading" />
          </div>
        </q-form>
      </template>
      <!-- login page mode : login - END -->

      <!-- login page mode : resume - START -->
      <template v-if="loginPageMode === 'resume'">
        <!-- Previous Session Resume -->
        <q-card-section class="previous-session-section">
          <q-banner :class="previousSession?.user.isOfflineUser ? 'bg-blue-1 text-blue-9' : 'bg-green-1 text-green-9'" class="q-mb-lg" rounded>
            <template v-slot:avatar>
              <q-icon
                :name="previousSession?.user.isOfflineUser ? 'offline_bolt' : 'cloud'"
                :color="previousSession?.user.isOfflineUser ? 'blue' : 'green'"
                size="32px"
              />
            </template>
            <div class="text-h6 q-mb-sm">Welcome Back!</div>
            <div class="text-body2">We found your previous {{ previousSession?.user.isOfflineUser ? "offline" : "online" }} session.</div>
          </q-banner>

          <div class="session-info q-mb-lg">
            <div class="text-subtitle1 q-mb-sm">Session Details</div>
            <div class="session-details">
              <div class="detail-item">
                <q-icon name="person" color="primary" size="16px" />
                <span class="q-ml-sm"><strong>Username:</strong> {{ previousSession?.user.username }}</span>
              </div>
              <div class="detail-item" v-if="previousSession?.user.domain">
                <q-icon name="domain" color="primary" size="16px" />
                <span class="q-ml-sm"><strong>Domain:</strong> {{ previousSession.user.domain }}</span>
              </div>
              <div class="detail-item" v-if="previousSession?.user.serverUrl">
                <q-icon name="cloud" color="primary" size="16px" />
                <span class="q-ml-sm"><strong>Server:</strong> {{ previousSession.user.serverUrl }}</span>
              </div>
              <div class="detail-item">
                <q-icon name="schedule" color="primary" size="16px" />
                <span class="q-ml-sm"><strong>Logged out:</strong> {{ logoutTimeFormatted }}</span>
              </div>
            </div>
          </div>

          <!-- Password input for online sessions -->
          <q-form v-if="!previousSession?.user.isOfflineUser" ref="resumeForm" @submit="resumePreviousSession" class="q-gutter-md q-mb-lg">
            <q-input
              type="password"
              filled
              v-model="resumePassword"
              label="Password"
              hint="Enter your password to resume this session"
              lazy-rules
              :rules="validators.password"
            />
            <q-checkbox v-model="shouldRememberPasswordForResume" label="Remember password on this device" />
          </q-form>

          <div class="session-actions q-gutter-md">
            <q-btn
              unelevated
              color="primary"
              :label="previousSession?.user.isOfflineUser ? 'Resume Offline Session' : 'Resume Online Session'"
              icon="restore"
              style="display: block; width: calc(100% - 16px); margin-left: 16px; margin-right: 16px"
              @click="resumePreviousSession"
              :loading="isLoading"
              :type="previousSession?.user.isOfflineUser ? 'button' : 'submit'"
              :form="previousSession?.user.isOfflineUser ? undefined : 'resumeForm'"
            />
          </div>

          <q-separator class="q-my-lg" />

          <div class="text-center">
            <div class="text-caption text-grey-7 q-mb-sm">Or login with different credentials</div>
            <q-btn flat color="primary" label="Use Different Credentials" @click="useDifferentCredentialsClicked" />
          </div>
        </q-card-section>
      </template>
      <!-- login page mode : resume - END -->
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { QForm, useQuasar } from "quasar";
import { DEFAULT_REMOTE_SERVER_URL, ServerOption, serverOptions } from "src/constants/auth-constants";
import { authService } from "src/services/auth-service";
import { configService } from "src/services/config-service";
import { NotificationType, dialogService } from "src/services/dialog-service";
import { localDataService } from "src/services/local-data-service";
import { previousSessionService } from "src/services/previous-session-service";
import { syncService } from "src/services/sync-service";
import { useUserStore } from "src/stores/user";
import { validators } from "src/utils/validators";
import { computed, ref } from "vue";
import { RouteLocationRaw, useRoute, useRouter } from "vue-router";

type LoginPageMode = "login" | "resume";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const $q = useQuasar();

// ------------------- shared state -------------------

const previousSession = ref(previousSessionService.getPreviousSession());
const loginPageMode = computed(() => {
  return previousSession.value ? "resume" : "login";
});

const isLoading = ref(false);

// ------------------- login page mode : login -------------------

const currentStep = ref(1);

const serverForm = ref<QForm | null>(null);
const loginForm = ref<QForm | null>(null);

const selectedServer = ref<ServerOption | null>(serverOptions[0]); // Default to first cluster
const customServerUrl = ref<string | null>(configService.getRemoteServerUrl());
const domain = ref<string | null>(configService.getDomainName());

const username = ref<string | null>(null);
const password = ref<string | null>(null);
const shouldRememberPassword = ref(false);

// ------------------- login page mode : resume -------------------

const resumeForm = ref<QForm | null>(null);

// Resume session state
const resumePassword = ref<string | null>(null);
const shouldRememberPasswordForResume = ref(false);

// -------------------  functions -------------------

const displayServerUrl = computed(() => {
  if (selectedServer.value?.value === "self-hosted") {
    return customServerUrl.value || "";
  }
  return DEFAULT_REMOTE_SERVER_URL;
});

const logoutTimeFormatted = computed(() => {
  if (!previousSession.value) return "";
  return previousSessionService.formatLogoutTime(previousSession.value.logoutAt);
});

async function onServerSelectionStepComplete() {
  const isValid = await serverForm.value!.validate();
  if (!isValid) return;
  currentStep.value = 2;
}

async function processLogin(serverUrl: string, domain: string, username: string, password: string, shouldRememberPassword: boolean) {
  isLoading.value = true;
  let [successful, failureReason] = await authService.login(serverUrl, domain, username, password, shouldRememberPassword);
  isLoading.value = false;

  if (!successful) {
    await dialogService.alert("Login Error", String(failureReason));
    return [false, failureReason];
  }

  dialogService.notify(NotificationType.LOGIN, "Successfully logged in.");

  try {
    await syncService.doFullSync($q, false, "LoginPage");
  } catch (error) {
    console.error(error);
    await dialogService.alert("Sync Error", "Unable to sync data. Please try again later.");
  }

  return [true, null];
}

async function onLoginSubmit() {
  const isValid = await loginForm.value!.validate();
  if (!isValid) return;

  const [successful, failureReason] = await processLogin(displayServerUrl.value, domain.value!, username.value!, password.value!, shouldRememberPassword.value);

  if (!successful) {
    return;
  }

  if (route.query && route.query.next) {
    await router.push(route.query.next as RouteLocationRaw);
  } else {
    await router.push("/");
  }
}

function goBackToServerSelection() {
  currentStep.value = 1;
}

async function removeLocalDataClicked() {
  domain.value = null;
  username.value = null;
  password.value = null;
  localDataService.removeLocalData();
  configService.clearRemoteServerUrl();
}

async function startOfflineSession() {
  await router.push({ name: "offline-onboarding" });
}

async function resumePreviousSession() {
  if (!previousSession.value) return;

  // For online sessions, validate the form first
  if (!previousSession.value.user.isOfflineUser) {
    const isValid = await resumeForm.value!.validate();
    if (!isValid) {
      return;
    }

    if (!resumePassword.value) {
      await dialogService.alert("Password Required", "Please enter your password to resume the online session.");
      return;
    }
  }

  isLoading.value = true;
  try {
    // For offline sessions, just restore the user
    if (previousSession.value.user.isOfflineUser) {
      userStore.setUser(previousSession.value.user);
    } else {
      // For online sessions, validate credentials and login
      const serverUrl = previousSession.value.user.serverUrl;
      const [successful, failureReason] = await processLogin(
        serverUrl,
        previousSession.value.user.domain,
        previousSession.value.user.username,
        resumePassword.value!,
        shouldRememberPasswordForResume.value
      );

      if (!successful) {
        return;
      }
    }

    // Clear the stored session
    previousSessionService.clearPreviousSession();

    // Navigate to the main app
    await router.push({ name: "overview" });
  } catch (error) {
    console.error("Error resuming previous session:", error);
    await dialogService.alert("Session Error", "There was an error resuming your session. Please try again.");
  } finally {
    isLoading.value = false;
  }
}

function useDifferentCredentialsClicked() {
  localDataService.removeLocalData();
}
</script>

<style scoped lang="scss">
.title {
  text-align: center;
  background-color: rgb(105, 187, 79);
  text-transform: uppercase;
  font-size: 26px;
  // padding-top: 8px;
}

.app-name {
  text-align: center;
  background-color: rgb(35, 35, 35);
  color: white;
  text-transform: uppercase;
  font-size: 20px;

  display: flex;
  align-items: center;
  justify-content: center;

  .logo {
    margin-right: 8px;
    margin-bottom: 4px;
    width: 40px;
    height: 40px;
  }
}

.login-card {
  min-width: 300px;
  max-width: 500px;
  width: 100%;
  margin: 12px;
}

.offline-trial-section {
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;

  .q-btn {
    font-weight: 500;
  }
}

.previous-session-section {
  .session-info {
    .session-details {
      .detail-item {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        padding: 8px 12px;
        background-color: #f8f9fa;
        border-radius: 6px;

        .q-icon {
          flex-shrink: 0;
        }
      }
    }
  }

  .session-actions {
    .q-btn {
      font-weight: 500;
    }
  }
}
</style>
