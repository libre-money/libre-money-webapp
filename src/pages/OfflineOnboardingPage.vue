<template>
  <q-page class="row items-center justify-evenly onboarding-page">
    <q-card class="onboarding-card">
      <!-- Header -->
      <div class="app-name q-pa-md">
        <img class="logo" src="icons/logo.png" alt="CK" />
        Libre Money
      </div>
      <div class="step-header q-pa-xs">
        <div class="step-title">{{ stepTitle }}</div>
        <div class="step-indicator">
          <q-linear-progress :value="stepProgress" color="primary" size="4px" class="q-mt-sm" />
          <div class="text-caption text-center q-mt-xs">Step {{ currentStep }} of 4</div>
        </div>
      </div>

      <!-- Step 1: Welcome -->
      <q-card-section v-if="currentStep === 1" class="step-content">
        <div class="welcome-section q-px-xl">
          <!-- Congratulations -->
          <q-banner class="bg-green-1 text-green-9 q-mb-lg" rounded>
            <template v-slot:avatar>
              <q-icon name="celebration" color="green" size="32px" />
            </template>
            <div class="text-h6 q-mb-sm">Congratulations!</div>
            <div class="text-body1">You've chosen Libre Money, the only personal finance & budgeting app that makes sense.</div>
          </q-banner>

          <!-- How Libre Money Works -->
          <div class="info-section q-mb-lg q-px-md">
            <div class="text-h6 q-mb-md">How Libre Money Works</div>

            <div class="feature-list">
              <div class="feature-item q-mb-md">
                <q-icon name="account_balance_wallet" size="24px" color="primary" class="q-mr-sm" />
                <div>
                  <div class="text-subtitle1">Track Everything</div>
                  <div class="text-body2 text-grey-7">Monitor your income, expenses, assets, and debts all in one place</div>
                </div>
              </div>

              <div class="feature-item q-mb-md">
                <q-icon name="insights" size="24px" color="primary" class="q-mr-sm" />
                <div>
                  <div class="text-subtitle1">Smart Analytics</div>
                  <div class="text-body2 text-grey-7">Get detailed reports and insights about your spending patterns</div>
                </div>
              </div>

              <div class="feature-item q-mb-md">
                <q-icon name="offline_bolt" size="24px" color="primary" class="q-mr-sm" />
                <div>
                  <div class="text-subtitle1">Works Offline</div>
                  <div class="text-body2 text-grey-7">Your data stays on your device - no internet required</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Offline Trial Info -->
          <div class="trial-info-section">
            <div class="upgrade-options q-mb-md">
              <div class="text-subtitle1 q-mb-sm">Future Upgrade Options</div>
              <div class="text-body2 text-grey-7 q-mb-sm">When you're ready, you can optionally upgrade to sync your data across devices:</div>

              <ul class="upgrade-list text-body2 text-grey-7">
                <li><strong>Managed Hosting:</strong> We'll provide a secure server for you</li>
                <li><strong>Self-Hosting:</strong> Host your own server with our guides</li>
                <li><strong>Complete Freedom:</strong> Stay offline forever if you prefer</li>
              </ul>
            </div>

            <q-banner class="bg-purple-1 text-purple-9" rounded>
              <template v-slot:avatar>
                <q-icon name="school" color="purple" />
              </template>
              <div class="text-body2">We provide detailed text and video guides for both hosting options when you're ready to upgrade.</div>
            </q-banner>
          </div>
        </div>
      </q-card-section>

      <!-- Step 2: Username Selection -->
      <q-card-section v-if="currentStep === 2" class="step-content">
        <div class="username-section">
          <div class="text-h6 q-mb-md">Choose Your Username</div>
          <div class="text-body2 text-grey-7 q-mb-lg">This will be your identifier within Libre Money.</div>

          <q-form @submit="createAccount" class="username-form">
            <q-input
              standout="bg-primary text-white"
              v-model="username"
              label="Username"
              placeholder="Enter your username"
              hint="6-20 characters, letters and numbers only"
              lazy-rules
              :rules="usernameRules"
              :error="!!usernameError"
              :error-message="usernameError"
              autofocus
              @input="clearUsernameError"
            >
              <template v-slot:prepend>
                <q-icon name="person" />
              </template>
            </q-input>

            <div class="username-requirements q-mt-md">
              <div class="text-caption text-grey-6">Requirements:</div>
              <div class="requirement-list">
                <div class="requirement-item" :class="{ met: username.length >= 6 }">
                  <q-icon
                    :name="username.length >= 6 ? 'check_circle' : 'radio_button_unchecked'"
                    :color="username.length >= 6 ? 'positive' : 'grey'"
                    size="16px"
                  />
                  <span class="q-ml-xs">At least 6 characters</span>
                </div>
                <div class="requirement-item" :class="{ met: username.length <= 20 }">
                  <q-icon
                    :name="username.length <= 20 ? 'check_circle' : 'radio_button_unchecked'"
                    :color="username.length <= 20 ? 'positive' : 'grey'"
                    size="16px"
                  />
                  <span class="q-ml-xs">Maximum 20 characters</span>
                </div>
                <div class="requirement-item" :class="{ met: /^[a-zA-Z0-9]*$/.test(username) }">
                  <q-icon
                    :name="/^[a-zA-Z0-9]*$/.test(username) ? 'check_circle' : 'radio_button_unchecked'"
                    :color="/^[a-zA-Z0-9]*$/.test(username) ? 'positive' : 'grey'"
                    size="16px"
                  />
                  <span class="q-ml-xs">Letters and numbers only</span>
                </div>
              </div>
            </div>
          </q-form>
        </div>
      </q-card-section>

      <!-- Step 3: Currency Selection -->
      <q-card-section v-if="currentStep === 3" class="step-content">
        <div class="currency-section">
          <div class="text-h6 q-mb-md">Select Your Currency</div>
          <div class="text-body2 text-grey-7 q-mb-lg">Choose the currency you'll use for tracking your finances.</div>

          <q-form class="currency-form">
            <q-select
              standout="bg-primary text-white"
              v-model="selectedCurrency"
              :options="currencyOptions"
              label="Currency"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              :rules="[(v) => !!v || 'Please select a currency']"
            >
              <template v-slot:prepend>
                <q-icon name="attach_money" />
              </template>
            </q-select>

            <!-- Custom Currency Input -->
            <div v-if="selectedCurrency === 'custom'" class="custom-currency-section q-mt-md">
              <div class="text-subtitle2 q-mb-md">Custom Currency Details</div>

              <q-input
                standout="bg-primary text-white"
                v-model="customCurrencyName"
                label="Currency Name"
                placeholder="e.g., Euro, Bitcoin"
                hint="Full name of your currency"
                :rules="customCurrencyRules"
                class="q-mb-md"
              >
                <template v-slot:prepend>
                  <q-icon name="label" />
                </template>
              </q-input>

              <q-input
                standout="bg-primary text-white"
                v-model="customCurrencySign"
                label="Currency Sign/Abbreviation"
                placeholder="e.g., EUR, BTC"
                hint="Short symbol or abbreviation"
                :rules="customCurrencyRules"
              >
                <template v-slot:prepend>
                  <q-icon name="code" />
                </template>
              </q-input>
            </div>
          </q-form>
        </div>
      </q-card-section>

      <!-- Step 4: Setup Progress -->
      <q-card-section v-if="currentStep === 4" class="step-content">
        <div class="setup-section">
          <template v-if="!setupComplete">
            <div class="text-h6 q-mb-md">Setting Up Your Account</div>
            <div class="text-body2 text-grey-7 q-mb-lg">We're creating your default accounts and categories. This will only take a moment.</div>
          </template>
          <!--
          <template v-if="setupComplete">
            <div class="text-h6 q-mb-md">Account Setup Complete</div>
            <div class="text-body2 text-grey-7 q-mb-lg">You can now start using Libre Money.</div>
          </template> -->

          <!-- Progress Display -->
          <div class="progress-display q-mb-lg">
            <div class="text-center q-mb-md">
              <q-circular-progress :value="progressValue" size="80px" :thickness="0.15" color="primary" track-color="grey-3" class="q-ma-md">
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
              <div class="text-subtitle1 q-mb-sm">What we've set up for you:</div>
              <div class="summary-grid">
                <div class="summary-item">
                  <q-icon name="attach_money" color="green" />
                  <span>Selected currency ({{ selectedCurrency === "custom" ? customCurrencySign : selectedCurrency }})</span>
                </div>
                <div class="summary-item">
                  <q-icon name="category" color="blue" />
                  <span>10 expense categories</span>
                </div>
                <div class="summary-item">
                  <q-icon name="account_balance_wallet" color="purple" />
                  <span>4 wallet types</span>
                </div>
                <div class="summary-item">
                  <q-icon name="trending_up" color="orange" />
                  <span>7 income sources</span>
                </div>
                <div class="summary-item">
                  <q-icon name="business" color="red" />
                  <span>Sample parties</span>
                </div>
                <div class="summary-item">
                  <q-icon name="label" color="pink" />
                  <span>Useful tags</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-section class="step-actions row">
        <q-btn v-if="currentStep > 1 && !setupComplete && !isCreatingAccount" flat label="Back" color="grey-7" @click="goBack" />
        <div class="spacer"></div>

        <!-- Step 1, 2, 3 Next Buttons -->
        <q-btn v-if="currentStep === 1" unelevated color="primary" label="Get Started" @click="nextStep" icon-right="arrow_forward" />
        <q-btn
          v-if="currentStep === 2"
          unelevated
          color="primary"
          label="Create Account"
          @click="createAccount"
          :disabled="!isUsernameValid"
          :loading="isCreatingAccount"
          icon-right="arrow_forward"
        />
        <q-btn
          v-if="currentStep === 3"
          unelevated
          color="primary"
          label="Continue"
          @click="proceedToSetup"
          :disabled="!isCurrencyValid"
          icon-right="arrow_forward"
        />

        <!-- Step 4 Dashboard Button -->
        <q-btn
          v-if="setupComplete"
          unelevated
          color="primary"
          label="Go to Dashboard"
          @click="goToDashboard"
          icon-right="dashboard"
          size="md"
          style="margin-top: -40px"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { Collection } from "src/constants/constants";
import { CURRENCY_MAP, CURRENCY_OPTIONS } from "src/constants/onboarding-constants";
import { Currency } from "src/models/currency";
import { dialogService } from "src/services/dialog-service";
import { OnboardingProgress, onboardingService } from "src/services/onboarding-service";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useQuasar } from "quasar";
import { useUserStore } from "src/stores/user";

const router = useRouter();
const $q = useQuasar();
const userStore = useUserStore();

// Step management
const currentStep = ref(1);
const username = ref("");
const usernameError = ref("");
const isCreatingAccount = ref(false);

// Currency selection
const selectedCurrency = ref("");
const customCurrencyName = ref("");
const customCurrencySign = ref("");

// Currency options
const currencyOptions = CURRENCY_OPTIONS;

// Progress tracking
const progressValue = ref(0);
const progressMessage = ref("Initializing...");
const setupComplete = ref(false);

// Computed properties
const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 1:
      return "Welcome to Libre Money";
    case 2:
      return "Create Your Account";
    case 3:
      return "Select Currency";
    case 4:
      return "Account Setup";
    default:
      return "Libre Money";
  }
});

const stepProgress = computed(() => {
  return currentStep.value / 4;
});

function validateUsername(username: string): string | null {
  if (!username || username.length < 6) {
    return "Username must be at least 6 characters long";
  }
  if (username.length > 20) {
    return "Username cannot be longer than 20 characters";
  }
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return "Username can only contain letters and numbers";
  }
  return null;
}

const isUsernameValid = computed(() => {
  return validateUsername(username.value) === null;
});

const isCurrencyValid = computed(() => {
  if (!selectedCurrency.value) return false;
  if (selectedCurrency.value === "custom") {
    return customCurrencyName.value.trim() !== "" && customCurrencySign.value.trim() !== "";
  }
  return true;
});

// Username validation rules
const usernameRules = [(val: string) => validateUsername(val) || true];

// Custom currency validation rules
const customCurrencyRules = [(val: string) => (val && val.trim()) || "This field is required"];

// Methods
function nextStep() {
  if (currentStep.value < 4) {
    currentStep.value++;
  }
}

function goBack() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

function clearUsernameError() {
  usernameError.value = "";
}

function createCurrencyObject(): Currency {
  if (selectedCurrency.value === "custom") {
    return {
      $collection: Collection.CURRENCY,
      name: customCurrencyName.value.trim(),
      sign: customCurrencySign.value.trim(),
      precisionMinimum: 2,
      precisionMaximum: 2,
    };
  } else {
    // Map predefined currencies
    const currency = CURRENCY_MAP[selectedCurrency.value];
    return {
      $collection: Collection.CURRENCY,
      name: currency.name,
      sign: currency.sign,
      precisionMinimum: 2,
      precisionMaximum: 2,
    };
  }
}

async function createAccount() {
  const validation = validateUsername(username.value);
  if (validation) {
    usernameError.value = validation;
    return;
  }

  isCreatingAccount.value = true;

  try {
    // Create offline user
    await onboardingService.createOfflineUser(username.value);
    // Move to currency selection step
    currentStep.value = 3;
  } catch (error) {
    console.error("Error during account creation:", error);
    await dialogService.alert("Account Creation Error", "There was an error creating your account. Please try again.");
  } finally {
    isCreatingAccount.value = false;
  }
}

async function proceedToSetup() {
  if (!isCurrencyValid.value) {
    return;
  }

  try {
    // Move to setup step
    currentStep.value = 4;

    // Create currency object
    const currency = createCurrencyObject();

    // Start setup process with progress tracking
    await onboardingService.setupDefaultAccounts(currency, (progress: OnboardingProgress) => {
      progressValue.value = progress.progress;
      progressMessage.value = progress.message;
    });

    // Mark setup as complete
    setupComplete.value = true;
    progressMessage.value = "Setup complete!";
  } catch (error) {
    console.error("Error during setup:", error);
    await dialogService.alert("Setup Error", "There was an error setting up your account. Please try again.");
    currentStep.value = 3; // Go back to currency step
  }
}

async function goToDashboard() {
  await onboardingService.completeOnboarding();
  await router.push({ name: "overview" });
}
</script>

<style scoped lang="scss">
.onboarding-card {
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
  // background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

  .step-title {
    text-align: center;
    font-size: 24px;
    font-weight: 500;
    // color: #2c3e50;
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

// Step 1 - Welcome
.welcome-section {
  .q-banner {
    border-left: 4px solid var(--q-green);
  }

  .feature-list {
    .feature-item {
      display: flex;
      align-items: flex-start;

      .q-icon {
        margin-top: 2px;
        flex-shrink: 0;
      }
    }
  }

  .upgrade-list {
    margin-left: 16px;

    li {
      margin-bottom: 4px;
    }
  }
}

// Step 2 - Username
.username-section {
  max-width: 400px;
  margin: 0 auto;

  .username-form {
    .q-input {
      margin-bottom: 16px;
    }
  }

  .username-requirements {
    .requirement-list {
      .requirement-item {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s ease;

        &.met {
          background-color: #e8f5e8;
          color: var(--q-positive);
        }

        .q-icon {
          flex-shrink: 0;
        }
      }
    }
  }
}

// Step 3 - Currency Selection
.currency-section {
  max-width: 500px;
  margin: 0 auto;

  .currency-form {
    .q-select {
      margin-bottom: 16px;
    }
  }

  .custom-currency-section {
    padding: 16px;
    background-color: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid var(--q-primary);

    .q-input {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

// Step 4 - Setup
.setup-section {
  text-align: center;

  .progress-display {
    .progress-message {
      max-width: 300px;
      margin: 0 auto;
    }
  }

  .setup-complete {
    .completion-summary {
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-top: 16px;

        .summary-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          // background-color: #f8f9fa;
          border-radius: 6px;
          text-align: left;

          .q-icon {
            margin-right: 8px;
            flex-shrink: 0;
          }
        }

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
        }
      }
    }
  }
}

.step-actions {
  padding: 16px 24px;
  // background-color: #f8f9fa;
  // border-top: 1px solid #e9ecef;

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
