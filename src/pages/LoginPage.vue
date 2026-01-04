<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="login-card">
      <div class="app-name q-pa-xs"><img class="logo" src="icons/logo.png" alt="LM" />Libre Money</div>

      <div class="title q-pa-md">{{ loginPageMode === "resume" ? "Resume Session" : "Sign In" }}</div>

      <!-- <div v-if="loginPageMode === 'login' && currentStep === 1" class="subtitle q-px-md q-pb-md">
        <div class="text-body2 text-grey-7 text-center">Choose where your data is stored, or start using the app offline.</div>
      </div> -->

      <!-- login page mode : login - START -->
      <template v-if="loginPageMode === 'login'">
        <q-card-section>
          <q-form ref="loginForm" @submit="onLoginSubmit" class="q-gutter-sm">
            <q-input standout="bg-primary text-white" v-model="username" label="Username" lazy-rules :rules="validators.username" />

            <q-input type="password" standout="bg-primary text-white" v-model="password" label="Password" lazy-rules :rules="validators.password" />

            <!-- Self-hosted options (shown when isSelfHosted is true) -->
            <template v-if="isSelfHosted">
              <q-input standout="bg-primary text-white" v-model="customServerUrl" label="Server URL" lazy-rules :rules="validators.url" />

              <q-input standout="bg-primary text-white" v-model="domain" label="Domain" lazy-rules :rules="validators.domain" />
            </template>

            <q-checkbox v-model="shouldRememberPassword" label="Remember password on this device" />

            <div class="row justify-end q-mt-md">
              <q-btn
                outline
                color="grey"
                :label="isSelfHosted ? 'Hide Self-hosted Options' : 'Self-hosted Options'"
                icon="dns"
                @click="isSelfHosted = !isSelfHosted"
                type="button"
              />
              <div class="spacer"></div>
              <q-btn label="Login" type="submit" color="primary" :loading="isLoading" />
            </div>
          </q-form>
        </q-card-section>

        <!-- Offline Mode Option -->
        <q-card-section class="offline-option-section">
          <q-separator class="q-mb-md" />

          <div class="text-center q-mb-md">
            <div class="text-h6 q-mb-sm">Try Libre Money Offline</div>
            <div class="text-body2 text-grey-7">
              Start using Libre Money immediately with full offline functionality. Your data is stored securely on your device. You can sync to the cloud later
              or continue using offline mode.
            </div>
          </div>

          <q-btn unelevated color="secondary" label="Start In Offline Mode" icon="offline_bolt" class="full-width" @click="startOfflineSession" />
        </q-card-section>

        <!-- Reset Local Data Option -->
        <q-card-section class="reset-data-section">
          <q-separator class="q-mb-md" />

          <div class="text-center">
            <q-btn label="Reset Local Data" type="button" flat color="primary" @click="removeLocalDataClicked" />
          </div>
        </q-card-section>
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
            <div class="text-h6 q-mb-sm">Previous Session Detected</div>
            <div class="text-body2">
              A previous {{ previousSession?.user.isOfflineUser ? "offline" : "online" }} session was found. You can resume it or sign in with different
              credentials.
            </div>
          </q-banner>

          <div class="session-info q-mb-lg">
            <div class="text-subtitle2 q-mb-sm text-grey-8">Session Information</div>
            <div class="session-details">
              <div class="detail-item">
                <q-icon name="person" color="primary" size="16px" />
                <span class="q-ml-sm">{{ previousSession?.user.username }}</span>
              </div>
              <div class="detail-item" v-if="previousSession?.user.domain">
                <q-icon name="domain" color="primary" size="16px" />
                <span class="q-ml-sm">{{ previousSession.user.domain }}</span>
              </div>
              <div class="detail-item" v-if="previousSession?.user.serverUrl">
                <q-icon name="cloud" color="primary" size="16px" />
                <span class="q-ml-sm text-caption">{{ previousSession.user.serverUrl }}</span>
              </div>
              <div class="detail-item">
                <q-icon name="schedule" color="primary" size="16px" />
                <span class="q-ml-sm text-caption">Last active: {{ logoutTimeFormatted }}</span>
              </div>
            </div>
          </div>

          <!-- Password input for online sessions -->
          <q-form v-if="!previousSession?.user.isOfflineUser" ref="resumeForm" @submit="resumePreviousSession" class="q-gutter-md q-mb-lg">
            <q-input type="password" standout="bg-primary text-white" v-model="resumePassword" label="Password" lazy-rules :rules="validators.password" />
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
            <div class="text-caption text-grey-7 q-mb-sm">Need to sign in with different credentials?</div>
            <q-btn flat color="primary" label="Sign In with Different Account" @click="useDifferentCredentialsClicked" />
          </div>
        </q-card-section>
      </template>
      <!-- login page mode : resume - END -->
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { QForm, useQuasar } from "quasar";
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

const loginForm = ref<QForm | null>(null);

const isSelfHosted = ref(false);
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

const logoutTimeFormatted = computed(() => {
  if (!previousSession.value) return "";
  return previousSessionService.formatLogoutTime(previousSession.value.logoutAt);
});

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
      usernameValue = username.value!;
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

    const [successful, failureReason] = await processLogin(serverUrl, domainValue, usernameValue, password.value!, shouldRememberPassword.value);

    if (!successful) {
      isLoading.value = false;
      return;
    }

    if (route.query && route.query.next) {
      await router.push(route.query.next as RouteLocationRaw);
    } else {
      await router.push("/");
    }
  } catch (error) {
    console.error("Login error:", error);
    await dialogService.alert("Login Error", "An unexpected error occurred. Please try again.");
  } finally {
    isLoading.value = false;
  }
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
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.02em;
}

.subtitle {
  margin-top: -8px;
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

.offline-option-section {
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
        margin-bottom: 6px;
        padding: 10px 12px;
        background-color: #f8f9fa;
        border-radius: 6px;
        transition: background-color 0.2s;

        &:hover {
          background-color: #e9ecef;
        }

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
