<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="login-card">
      <div class="app-name q-pa-xs"><img class="logo" src="icons/logo.png" alt="CK" />Cash Keeper</div>
      <div class="title q-pa-xs">{{ currentStep === 1 ? "Select Server" : "Login" }}</div>

      <!-- Step 1: Server Selection -->
      <q-form v-if="currentStep === 1" ref="serverForm" @submit="onServerSubmit" class="q-gutter-md q-pa-md">
        <q-select
          filled
          v-model="selectedServer"
          :options="serverOptions"
          label="Select Server"
          lazy-rules
          :rules="[(val) => !!val || 'Please select a server']"
        />

        <!-- Custom Server URL input (only for Self Hosted) -->
        <q-input v-if="selectedServer?.value === 'self-hosted'" filled v-model="customServerUrl" label="Server URL" lazy-rules :rules="validators.url" />

        <!-- Domain input -->
        <q-input filled v-model="domain" label="Domain" lazy-rules :rules="validators.domain" />

        <div class="row justify-end">
          <q-btn label="Next" type="submit" color="primary" />
        </div>
      </q-form>

      <!-- Offline Trial Option -->
      <q-card-section v-if="currentStep === 1" class="offline-trial-section">
        <q-separator class="q-mb-md" />

        <div class="text-center q-mb-md">
          <div class="text-h6 q-mb-sm">Try Without Account</div>
          <div class="text-body2 text-grey-7">Start using Cash Keeper immediately with unlimited offline access</div>
        </div>

        <q-btn unelevated color="secondary" label="Start Your Journey" icon="offline_bolt" class="full-width" @click="startOfflineTrial" />
      </q-card-section>

      <!-- Step 2: Username & Password -->
      <q-form v-if="currentStep === 2" ref="loginForm" @submit="onLoginSubmit" class="q-gutter-md q-pa-md">
        <!-- Server info display -->
        <q-banner class="bg-grey-2 text-dark q-mb-md">
          <div class="text-subtitle2">Server: {{ selectedServer?.label }}</div>
          <div class="text-caption">{{ displayServerUrl }}</div>
          <div class="text-caption">Domain: {{ domain }}</div>
        </q-banner>

        <q-input filled v-model="username" label="Username" lazy-rules :rules="validators.username" />

        <q-input type="password" filled v-model="password" label="Password" lazy-rules :rules="validators.password" />

        <q-checkbox v-model="shouldRememberPassword" label="Store password on this device" />

        <div class="row">
          <q-btn label="Back" type="button" color="grey" flat @click="goBackToServerSelection" />
          <q-btn label="Reset Local Data" type="button" color="grey" flat class="q-ml-sm" @click="removeLocalDataClicked" />
          <div class="spacer"></div>
          <q-btn label="Login" type="submit" color="primary" :loading="isLoading" />
        </div>
      </q-form>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { QForm, useQuasar } from "quasar";
import { configService } from "src/services/config-service";
import { NotificationType, dialogService } from "src/services/dialog-service";
import { localDataService } from "src/services/local-data-service";
import { authService } from "src/services/auth-service";
import { syncService } from "src/services/sync-service";
import { validators } from "src/utils/validators";
import { Ref, defineComponent, ref, computed } from "vue";
import { RouteLocationRaw, useRoute, useRouter } from "vue-router";
import { DEFAULT_REMOTE_SERVER_URL, serverOptions, ServerOption } from "src/constants/auth-constants";

export default defineComponent({
  name: "IndexPage",
  components: {},
  setup() {
    const route = useRoute();
    const router = useRouter();

    const $q = useQuasar();

    const currentStep = ref(1);

    const isLoading = ref(false);

    const serverForm: Ref<QForm | null> = ref(null);
    const loginForm: Ref<QForm | null> = ref(null);

    // Server selection state
    const selectedServer: Ref<ServerOption | null> = ref(serverOptions[0]); // Default to first cluster
    const customServerUrl: Ref<string | null> = ref(configService.getRemoteServerUrl());
    const domain: Ref<string | null> = ref(configService.getDomainName());

    // Login state
    const username: Ref<string | null> = ref(null);
    const password: Ref<string | null> = ref(null);
    const shouldRememberPassword: Ref<boolean> = ref(false);

    // Computed server URL for display
    const displayServerUrl = computed(() => {
      if (selectedServer.value?.value === "self-hosted") {
        return customServerUrl.value || "";
      }
      return DEFAULT_REMOTE_SERVER_URL;
    });

    return {
      validators,
      currentStep,
      isLoading,
      serverForm,
      loginForm,
      serverOptions,
      selectedServer,
      customServerUrl,
      domain,
      username,
      password,
      shouldRememberPassword,
      displayServerUrl,

      async onServerSubmit() {
        const isValid = await serverForm.value!.validate();
        if (!isValid) return;
        currentStep.value = 2;
      },

      async onLoginSubmit() {
        const isValid = await loginForm.value!.validate();
        if (!isValid) return;

        isLoading.value = true;
        let [successful, failureReason] = await authService.login(
          displayServerUrl.value,
          domain.value!,
          username.value!,
          password.value!,
          shouldRememberPassword.value
        );
        isLoading.value = false;

        if (!successful) {
          await dialogService.alert("Login Error", failureReason as string);
          return;
        }

        dialogService.notify(NotificationType.LOGIN, "Successfully logged in.");

        try {
          await syncService.doFullSync($q, false, "LoginPage");
        } catch (error) {
          console.error(error);
          await dialogService.alert("Sync Error", "Unable to sync data. Please try again later.");
        }

        if (route.query && route.query.next) {
          await router.push(route.query.next as RouteLocationRaw);
        } else {
          await router.push("/");
        }
      },

      goBackToServerSelection() {
        currentStep.value = 1;
      },

      async removeLocalDataClicked() {
        domain.value = null;
        username.value = null;
        password.value = null;
        localDataService.removeLocalData();
        configService.clearRemoteServerUrl();
      },

      async startOfflineTrial() {
        await router.push({ name: "offline-onboarding" });
      },
    };
  },
});
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
</style>
