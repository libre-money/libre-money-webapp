<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title text-center">Get Your Account</div>
      </div>

      <q-separator />

      <!-- Main Content -->
      <div class="q-pa-md">
        <div class="text-h6 q-mb-md">You're One Step Away!</div>
        <div class="text-body2 text-grey-7 q-mb-lg">
          You've been exploring Libre Money with demo data. Now it's time to get your own account and start managing your real finances!
        </div>

        <q-list class="q-mb-lg">
          <q-item>
            <q-item-section avatar>
              <q-icon name="person" color="primary" size="24px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">Your Own Data</q-item-label>
              <q-item-label caption>Start tracking your real income, expenses, and financial goals</q-item-label>
            </q-item-section>
          </q-item>

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
              <q-icon name="offline_bolt" color="primary" size="24px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">Offline First</q-item-label>
              <q-item-label caption>Continue using offline, or sync when you're ready</q-item-label>
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

        <div class="action-buttons q-pa-md">
          <q-btn unelevated color="primary" label="Get Your Account" icon="person_add" @click="getYourAccount" class="full-width" size="md" />
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { pouchdbService } from "src/services/pouchdb-service";
import { authService } from "src/services/auth-service";
import { localDataService } from "src/services/local-data-service";

const router = useRouter();

// Methods
async function getYourAccount() {
  try {
    await localDataService.removeLocalData(false, true, "/offline-onboarding");

    // Navigate to offline onboarding
    await router.push({ name: "offline-onboarding" });
  } catch (error) {
    console.error("Error clearing data:", error);
    // Still navigate even if clearing fails
    await router.push({ name: "offline-onboarding" });
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
