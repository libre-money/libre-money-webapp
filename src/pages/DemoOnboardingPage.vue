<template>
  <q-page class="row items-center justify-evenly onboarding-page">
    <q-card class="onboarding-card1">
      <!-- Header -->
      <div class="app-name q-pa-md">
        <img class="logo" src="icons/logo.png" alt="LM" />
        Libre Money
      </div>
      <div class="step-header q-pa-xs">
        <div class="step-title">Exploring Libre Money</div>
        <div class="step-indicator">
          <q-linear-progress :value="progressValue / 100" color="primary" size="4px" class="q-mt-sm" />
          <div class="text-caption text-center q-mt-xs">{{ Math.round(progressValue) }}% Complete</div>
        </div>
      </div>

      <!-- Demo Setup Content -->
      <q-card-section class="step-content">
        <div class="demo-setup-section">
          <template v-if="!setupComplete">
            <div class="text-h6 q-mb-md">Preparing Your Demo Experience</div>
            <div class="text-body2 text-grey-7 q-mb-lg">
              We're setting up a comprehensive demo account with sample data so you can explore all the features of
              Libre Money.
            </div>
          </template>

          <template v-if="setupComplete">
            <div class="text-h6 q-mb-md">Demo Ready!</div>
            <div class="text-body2 text-grey-7 q-mb-lg">Your demo account is ready. Explore all the features with sample
              data.</div>
          </template>

          <!-- Progress Display -->
          <div class="progress-display q-mb-lg">
            <div class="text-center q-mb-md">
              <q-circular-progress :value="progressValue" size="80px" :thickness="0.15" color="primary"
                track-color="grey-3" class="q-ma-md">
                <div class="text-h6">{{ Math.round(progressValue) }}%</div>
              </q-circular-progress>
            </div>

            <div class="progress-message text-center">
              <div class="text-body1 q-mb-xs">{{ progressMessage }}</div>
              <q-linear-progress :value="progressValue / 100" color="primary" size="6px" rounded />
            </div>
          </div>

          <!-- Setup Complete -->
          <div v-if="setupComplete" class="setup-complete">
            <div class="completion-summary q-mb-lg">
              <div class="summary-header" @click="toggleSummaryExpanded">
                <div class="text-subtitle1">What's included in your demo?</div>
                <q-icon :name="summaryExpanded || isDesktop ? 'expand_less' : 'expand_more'" class="summary-chevron"
                  size="24px" />
              </div>
              <transition name="slide-down">
                <div v-show="summaryExpanded || isDesktop" class="summary-content">
                  <div class="summary-grid">
                    <div class="summary-item">
                      <q-icon name="attach_money" color="green" />
                      <span>Sample currencies</span>
                    </div>
                    <div class="summary-item">
                      <q-icon name="category" color="blue" />
                      <span>Expense categories</span>
                    </div>
                    <div class="summary-item">
                      <q-icon name="account_balance_wallet" color="purple" />
                      <span>Multiple wallets</span>
                    </div>
                    <div class="summary-item">
                      <q-icon name="trending_up" color="orange" />
                      <span>Income sources</span>
                    </div>
                    <div class="summary-item">
                      <q-icon name="business" color="red" />
                      <span>Sample parties</span>
                    </div>
                    <div class="summary-item">
                      <q-icon name="label" color="pink" />
                      <span>Tags and labels</span>
                    </div>
                    <div class="summary-item">
                      <q-icon name="receipt" color="teal" />
                      <span>Sample transactions</span>
                    </div>
                    <div class="summary-item">
                      <q-icon name="account_balance" color="indigo" />
                      <span>Assets and budgets</span>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-section class="step-actions row" style="margin-top: -40px">
        <div class="spacer"></div>
        <q-btn v-if="setupComplete" unelevated color="primary" label="Go to Dashboard" @click="goToDashboard"
          icon-right="dashboard" size="md" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { demoOnboardingService } from "src/services/demo-onboarding-service";
import { dialogService } from "src/services/dialog-service";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useQuasar } from "quasar";

const router = useRouter();
const $q = useQuasar();

// Progress tracking
const progressValue = ref(0);
const progressMessage = ref("Initializing demo setup...");
const setupComplete = ref(false);
const summaryExpanded = ref(false);

const isDesktop = computed(() => $q.screen.gt.xs);

function toggleSummaryExpanded() {
  // Only toggle on mobile
  if (!$q.screen.gt.xs) {
    summaryExpanded.value = !summaryExpanded.value;
  }
}

// Watch for setup complete to expand summary on desktop
watch(setupComplete, (newValue) => {
  if (newValue) {
    // Always expanded on desktop, collapsed on mobile
    summaryExpanded.value = $q.screen.gt.xs;
  }
});

async function setupDemo() {
  try {
    // Create demo user first
    await demoOnboardingService.createDemoUser();

    // Start setup process with progress tracking
    await demoOnboardingService.setupDemoAccount((progress) => {
      progressValue.value = progress.progress;
      progressMessage.value = progress.message;
    });

    // Mark setup as complete
    setupComplete.value = true;
    progressMessage.value = "Demo setup complete!";
  } catch (error) {
    console.error("Error during demo setup:", error);
    await dialogService.alert("Demo Setup Error", "There was an error setting up the demo. Please try again.");
  }
}

async function goToDashboard() {
  await demoOnboardingService.completeDemoOnboarding();
  await router.push({ name: "overview" });
}

onMounted(() => {
  setupDemo();
});
</script>

<style scoped lang="scss">
.onboarding-card1 {
  width: 100%;
  max-width: 600px;
  margin: 8px;

  @media (min-width: 616px) {
    width: 600px;
    margin: 8px auto;
  }
}

.onboarding-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
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

.step-header {
  .step-title {
    text-align: center;
    font-size: 24px;
    font-weight: 500;
  }

  .step-indicator {
    max-width: 300px;
    margin: 0 auto;
  }
}

.step-content {
  padding: 32px 24px;
  min-height: 400px;

  @media (max-width: 600px) {
    padding: 24px 16px;
  }
}

.demo-setup-section {
  text-align: center;

  .progress-display {
    .progress-message {
      max-width: 300px;
      margin: 0 auto;
    }
  }

  .setup-complete {
    .completion-summary {
      .summary-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        cursor: default;

        @media (max-width: 600px) {
          cursor: pointer;
          justify-content: center;
          position: relative;
        }

        .summary-chevron {
          display: none;

          @media (max-width: 600px) {
            display: block;
            color: rgba(0, 0, 0, 0.54);
            transition: transform 0.2s ease;
            position: absolute;
            right: 0;
          }
        }

        .text-subtitle1 {
          @media (max-width: 600px) {
            text-align: center;
            flex: 1;
          }
        }
      }

      .summary-content {
        @media (min-width: 601px) {
          display: block !important;
        }
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-top: 16px;

        .summary-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 6px;
          text-align: left;

          .q-icon {
            margin-right: 8px;
            flex-shrink: 0;
          }
        }

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
          margin-top: 8px;
        }
      }
    }
  }
}

// Slide down transition for expand/collapse
.slide-down-enter-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from {
  max-height: 0;
  opacity: 0;
}

.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 1000px;
  opacity: 1;
}

.step-actions {
  padding: 16px 24px;

  .q-btn {
    font-weight: 500;
  }
}

// Responsive adjustments
@media (max-width: 600px) {
  .step-actions {
    flex-direction: column;
    gap: 12px;

    .q-btn {
      width: 100%;
    }
  }
}
</style>
