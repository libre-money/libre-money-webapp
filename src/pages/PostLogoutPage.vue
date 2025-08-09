<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="post-logout-card">
      <!-- Header -->
      <div class="app-name q-pa-xs">
        <img class="logo" src="icons/logo.png" alt="CK" />
        Libre Money
      </div>

      <!-- Content -->
      <q-card-section class="post-logout-content">
        <!-- Status Banner -->
        <q-banner class="bg-green-1 text-green-9 q-mb-lg" rounded>
          <template v-slot:avatar>
            <q-icon name="check_circle" color="green" />
          </template>
          <div class="text-body1 q-mb-xs">You have been successfully logged out.</div>
        </q-banner>

        <!-- Information Section -->
        <div class="info-section q-mb-lg">
          <div class="row items-start q-mb-md">
            <div class="row items-center align-center">
              <q-icon name="info" size="24px" color="blue" class="q-mr-sm q-mt-xs" style="margin-top: -10px" />
              <div class="text-subtitle1 q-mb-sm">Your Data is Safe</div>
            </div>
            <div class="text-body2 text-grey-7">
              Your transactions, wallets, and other financial data remain stored locally on this device. Logging out does not delete your personal information.
            </div>
          </div>

          <div class="row items-start">
            <div class="row items-center align-center">
              <q-icon name="storage" size="24px" color="orange" class="q-mr-sm q-mt-xs" style="margin-top: -10px" />
              <div class="text-subtitle1 q-mb-sm">Local Data Storage</div>
            </div>
            <div class="text-body2 text-grey-7">Your data will remain available when you log back in, and will sync with the server when you reconnect.</div>
          </div>
        </div>

        <!-- Options Section -->
        <div class="options-section">
          <div class="text-h6 q-mb-md">What would you like to do?</div>

          <div class="option-cards">
            <!-- Login Option -->
            <q-card class="option-card q-mb-md" flat bordered>
              <q-card-section class="row items-center">
                <q-icon name="login" size="32px" color="primary" class="q-mr-md" />
                <div class="col">
                  <div class="text-subtitle1">Return to Login</div>
                  <div class="text-body2 text-grey-6">Log in again to access your account and sync your data</div>
                </div>
                <q-btn unelevated color="primary" label="Login" @click="goToLogin" class="q-ml-md" />
              </q-card-section>
            </q-card>

            <!-- Clear Data Option -->
            <q-card class="option-card" flat bordered>
              <q-card-section class="row items-center">
                <q-icon name="delete_sweep" size="32px" color="red" class="q-mr-md" />
                <div class="col">
                  <div class="text-subtitle1">Clear Local Data</div>
                  <div class="text-body2 text-grey-6">Remove all data from this device (this cannot be undone)</div>
                </div>
                <q-btn outline color="red" label="Clear Data" @click="clearLocalData" class="q-ml-md" />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>

      <!-- Footer -->
      <q-card-section class="post-logout-footer">
        <div class="row items-center justify-center q-gutter-md">
          <q-btn flat color="grey-6" size="sm" @click="goToAbout"> About Libre Money </q-btn>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { APP_BUILD_DATE, APP_BUILD_VERSION, APP_VERSION } from "src/constants/config-constants";
import { dialogService } from "src/services/dialog-service";
import { localDataService } from "src/services/local-data-service";
import { useRouter } from "vue-router";

const router = useRouter();

async function goToLogin() {
  await router.push({ name: "login" });
}

async function clearLocalData() {
  const confirmed = await dialogService.confirm(
    "Clear All Local Data",
    "Are you sure you want to remove all local data from this device? This action cannot be undone. All your transactions, wallets, and settings will be permanently deleted from this device. However, no data will be deleted from the remote server."
  );
  if (!confirmed) return;
  try {
    await localDataService.removeLocalData();
  } catch (error) {
    console.error("Error clearing local data:", error);
    await dialogService.alert("Error", "There was an error clearing local data. Please try again or contact support.");
    router.push({ name: "login" }).catch(() => {
      // ignore
    });
  }
}

async function goToAbout() {
  await router.push({ name: "about" });
}

async function showVersionInfo() {
  const title = `Libre Money v${APP_VERSION}`;
  const body = `Build: ${APP_BUILD_VERSION}\nRelease Date: ${APP_BUILD_DATE}`;
  await dialogService.alert(title, body);
}
</script>

<style scoped lang="scss">
.post-logout-card {
  min-width: 300px;
  max-width: 500px;
  margin: 16px;
  border-radius: 2px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  @media (max-width: 500px) {
    min-width: 300px;
    margin: 8px;
  }
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

.title {
  text-align: center;
  background-color: rgb(105, 187, 79);
  text-transform: uppercase;
  font-size: 26px;
  color: white;
  font-weight: 500;
}

.post-logout-content {
  padding: 32px 24px;

  @media (max-width: 500px) {
    padding: 24px 16px;
  }
}

.info-section {
  .q-icon {
    flex-shrink: 0;
  }
}

.post-logout-footer {
  background-color: #f8f9fa;
  padding: 16px;
  border-top: 1px solid #e9ecef;

  .q-btn {
    font-size: 12px;
  }
}

// Banner styling
.q-banner {
  border-left: 4px solid var(--q-green);
}

// Responsive adjustments
@media (max-width: 500px) {
  .options-section {
    .option-cards {
      .option-card {
        .q-card-section {
          flex-direction: column;
          text-align: center;

          .q-icon {
            margin-bottom: 12px;
            margin-right: 0;
          }

          .q-btn {
            margin-left: 0;
            margin-top: 12px;
            width: 100%;
          }
        }
      }
    }
  }
}
</style>
