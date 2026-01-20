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
          <div class="text-caption text-center q-mt-xs">Step {{ currentStep }} of 5</div>
        </div>
      </div>

      <!-- Step 1: Welcome -->
      <q-card-section v-if="currentStep === 1" class="step-content">
        <div class="welcome-section">
          <q-carousel v-model="welcomeSlide" swipeable animated arrows control-color="pink" navigation padding
            height="100%" class="welcome-carousel">
            <!-- Slide 1: Welcome -->
            <q-carousel-slide name="welcome" class="column items-center justify-center">
              <div class="slide-content welcome-slide-content">
                <div class="welcome-icon-wrapper">
                  <q-icon name="celebration" color="primary" :size="$q.screen.lt.sm ? '64px' : '80px'" />
                </div>
                <div class="text-h5 q-mt-lg q-mb-md text-center welcome-title">Congratulations!</div>
                <div class="text-body1 text-center welcome-message">You've chosen Libre Money, the only personal finance
                  & budgeting app that
                  makes sense.</div>
              </div>
            </q-carousel-slide>

            <!-- Slide 2: Track Everything -->
            <q-carousel-slide name="track" class="column items-center justify-center">
              <div class="slide-content welcome-slide-content">
                <div class="welcome-icon-wrapper">
                  <q-icon name="account_balance_wallet" color="primary" :size="$q.screen.lt.sm ? '64px' : '80px'" />
                </div>
                <div class="text-h5 q-mt-lg q-mb-md text-center welcome-title">Track Everything</div>
                <div class="text-body1 text-center welcome-message">Monitor your income, expenses, assets, and debts all
                  in one place. Get a complete picture of your financial health.</div>
              </div>
            </q-carousel-slide>

            <!-- Slide 3: Analytics and Budgeting -->
            <q-carousel-slide name="analytics" class="column items-center justify-center">
              <div class="slide-content welcome-slide-content">
                <div class="welcome-icon-wrapper">
                  <q-icon name="insights" color="primary" :size="$q.screen.lt.sm ? '64px' : '80px'" />
                </div>
                <div class="text-h5 q-mt-lg q-mb-md text-center welcome-title">Analytics and Budgeting</div>
                <div class="text-body1 text-center welcome-message">Get detailed reports and insights about your
                  spending patterns. Create and manage budgets that actually work for you.</div>
              </div>
            </q-carousel-slide>

            <!-- Slide 4: Works Offline -->
            <q-carousel-slide name="offline" class="column items-center justify-center">
              <div class="slide-content welcome-slide-content">
                <div class="welcome-icon-wrapper">
                  <q-icon name="offline_bolt" color="primary" :size="$q.screen.lt.sm ? '64px' : '80px'" />
                </div>
                <div class="text-h5 q-mt-lg q-mb-md text-center welcome-title">Works Offline</div>
                <div class="text-body1 text-center welcome-message">Your data stays on your device - no internet
                  required. Access your finances anytime, even without connectivity.</div>
              </div>
            </q-carousel-slide>

            <!-- Slide 5: Privacy Respecting Optional Cloud -->
            <q-carousel-slide name="privacy" class="column items-center justify-center">
              <div class="slide-content welcome-slide-content">
                <div class="welcome-icon-wrapper">
                  <q-icon name="lock" color="primary" :size="$q.screen.lt.sm ? '64px' : '80px'" />
                </div>
                <div class="text-h5 q-mt-lg q-mb-md text-center welcome-title">Cloud Account (Optional)</div>
                <div class="text-body1 text-center welcome-message">When you're ready, optionally sync your data across
                  devices with managed or self-hosted solutions. Your privacy is always respected.</div>
              </div>
            </q-carousel-slide>
          </q-carousel>
        </div>
      </q-card-section>

      <!-- Step 2: Username Selection -->
      <q-card-section v-if="currentStep === 2" class="step-content">
        <div class="username-section">
          <div class="text-h6 q-mb-md">Choose Your Username</div>
          <div class="text-body2 text-grey-7 q-mb-lg">This will be your identifier within Libre Money.</div>

          <q-form @submit="createAccount" class="username-form">
            <q-input standout="bg-primary text-white" v-model="username" label="Username"
              placeholder="Enter your username" hint="6-20 characters, letters and numbers only" lazy-rules
              :rules="usernameRules" :error="!!usernameError" :error-message="usernameError" autofocus
              @input="clearUsernameError">
              <template v-slot:prepend>
                <q-icon name="person" />
              </template>
            </q-input>

            <div class="username-requirements q-mt-md">
              <div class="text-caption text-grey-6">Requirements:</div>
              <div class="requirement-list">
                <div class="requirement-item" :class="{ met: username.length >= 6 }">
                  <q-icon :name="username.length >= 6 ? 'check_circle' : 'radio_button_unchecked'"
                    :color="username.length >= 6 ? 'positive' : 'grey'" size="16px" />
                  <span class="q-ml-xs">At least 6 characters</span>
                </div>
                <div class="requirement-item" :class="{ met: username.length <= 20 }">
                  <q-icon :name="username.length <= 20 ? 'check_circle' : 'radio_button_unchecked'"
                    :color="username.length <= 20 ? 'positive' : 'grey'" size="16px" />
                  <span class="q-ml-xs">Maximum 20 characters</span>
                </div>
                <div class="requirement-item" :class="{ met: /^[a-zA-Z0-9]*$/.test(username) }">
                  <q-icon :name="/^[a-zA-Z0-9]*$/.test(username) ? 'check_circle' : 'radio_button_unchecked'"
                    :color="/^[a-zA-Z0-9]*$/.test(username) ? 'positive' : 'grey'" size="16px" />
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
            <q-select standout="bg-primary text-white" v-model="selectedCurrency" :options="currencyOptions"
              label="Currency" option-label="label" option-value="value" emit-value map-options
              :rules="[(v) => !!v || 'Please select a currency']">
              <template v-slot:prepend>
                <q-icon name="attach_money" />
              </template>
            </q-select>

            <!-- Custom Currency Input -->
            <div v-if="selectedCurrency === 'custom'" class="custom-currency-section q-mt-md">
              <div class="text-subtitle2 q-mb-md">Custom Currency Details</div>

              <q-input standout="bg-primary text-white" v-model="customCurrencyName" label="Currency Name"
                placeholder="e.g., Euro, Bitcoin" hint="Full name of your currency" :rules="customCurrencyRules"
                class="q-mb-md">
                <template v-slot:prepend>
                  <q-icon name="label" />
                </template>
              </q-input>

              <q-input standout="bg-primary text-white" v-model="customCurrencySign" label="Currency Sign/Abbreviation"
                placeholder="e.g., EUR, BTC" hint="Short symbol or abbreviation" :rules="customCurrencyRules">
                <template v-slot:prepend>
                  <q-icon name="code" />
                </template>
              </q-input>
            </div>
          </q-form>
        </div>
      </q-card-section>

      <!-- Step 4: Optional Telemetry -->
      <q-card-section v-if="currentStep === 4" class="step-content">
        <div class="telemetry-section">
          <div class="text-h6 q-mb-md">One-time Telemetry (Optional)</div>
          <div class="text-body2 text-grey-7 q-mb-lg">
            This is <strong>entirely optional</strong>. If you agree, it'll allow us know that we have a new user and
            motivate
            us to improve Libre Money.
          </div>

          <q-form class="telemetry-form">
            <q-checkbox v-model="allowOneTimeTelemetry" label="Allow one-time telemetry" class="q-mb-md" />

            <div class="text-body2 text-grey-7 q-mb-lg">You can optionally provide your email address if you want to
              hear from
              us in the future.</div>

            <q-input standout="bg-primary text-white" v-model="telemetryEmail" label="Email Address (Optional)"
              placeholder="Enter your email" type="email" :rules="telemetryEmailRules" class="q-mb-md">
              <template v-slot:prepend>
                <q-icon name="email" />
              </template>
            </q-input>
          </q-form>
        </div>
      </q-card-section>

      <!-- Step 5: Setup Progress -->
      <q-card-section v-if="currentStep === 5" class="step-content">
        <div class="setup-section">
          <template v-if="!setupComplete">
            <div class="text-h6 q-mb-md">Setting Up Your Account</div>
            <div class="text-body2 text-grey-7 q-mb-lg">We're creating your default accounts and categories. This will
              only take a moment.</div>
          </template>

          <template v-if="setupComplete">
            <div class="text-h6 q-mb-md">Account Setup Complete</div>
            <div class="text-body2 text-grey-7 q-mb-lg">You can now start using Libre Money.</div>
          </template>

          <!-- Progress Display -->
          <div v-if="!setupComplete" class="progress-display q-mb-lg">
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
              <div class="text-subtitle1 q-mb-sm">What we've set up for you:</div>
              <div class="summary-grid">
                <div class="summary-item">
                  <q-icon name="attach_money" color="green" />
                  <span>Selected currency ({{ selectedCurrency === "custom" ? customCurrencySign : selectedCurrency
                  }})</span>
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
                  <q-icon name="label" color="pink" />
                  <span>Useful tags and parties</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-section class="step-actions row">
        <q-btn v-if="currentStep > 1 && !setupComplete && !isCreatingAccount" flat label="Back" color="grey-7"
          @click="goBack" class="back-button" />
        <div class="spacer"></div>

        <!-- Step 1, 2, 3 Next Buttons -->
        <q-btn v-if="currentStep === 1" unelevated color="primary" label="Get Started" @click="nextStep"
          icon-right="arrow_forward" class="primary-button" />
        <q-btn v-if="currentStep === 2" unelevated color="primary" label="Create Account" @click="createAccount"
          :disabled="!isUsernameValid" :loading="isCreatingAccount" icon-right="arrow_forward" class="primary-button" />
        <q-btn v-if="currentStep === 3" unelevated color="primary" label="Continue" @click="proceedToTelemetry"
          :disabled="!isCurrencyValid" icon-right="arrow_forward" class="primary-button" />
        <q-btn v-if="currentStep === 4" unelevated color="primary" label="Continue" @click="proceedToSetup"
          icon-right="arrow_forward" class="primary-button" />

        <!-- Step 4 Dashboard Button -->
        <q-btn v-if="setupComplete" unelevated color="primary" label="Go to Dashboard" @click="goToDashboard"
          icon-right="dashboard" class="primary-button dashboard-button" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { Collection } from "src/constants/constants";
import { CURRENCY_MAP, CURRENCY_OPTIONS } from "src/constants/onboarding-constants";
import { Currency } from "src/schemas/currency";
import { dialogService } from "src/services/dialog-service";
import { OnboardingProgress, onboardingService } from "src/services/onboarding-service";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useQuasar } from "quasar";
import { useUserStore } from "src/stores/user";
import { authService, TelemetryCurrency } from "src/services/auth-service";

const router = useRouter();
const $q = useQuasar();
const userStore = useUserStore();

// Step management
const currentStep = ref(1);
const welcomeSlide = ref("welcome");
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
      return "Help Us Improve";
    case 5:
      return "Account Setup";
    default:
      return "Libre Money";
  }
});

const stepProgress = computed(() => {
  return currentStep.value / 5;
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

// Telemetry email validation rules (optional - only validate if provided)
const telemetryEmailRules = [
  (val: string) => {
    if (!val || val.trim() === "") return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val) || "Please enter a valid email address";
  },
];

// Telemetry
const telemetryEmail = ref("");
const allowOneTimeTelemetry = ref(true);

// Methods
function nextStep() {
  if (currentStep.value < 5) {
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

function createTelemetryCurrency(): TelemetryCurrency {
  if (selectedCurrency.value === "custom") {
    return {
      name: customCurrencyName.value.trim(),
      sign: customCurrencySign.value.trim(),
    };
  } else {
    // Return the currency code as a string for predefined currencies
    return selectedCurrency.value;
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

async function proceedToTelemetry() {
  if (!isCurrencyValid.value) {
    return;
  }

  // Move to telemetry step
  currentStep.value = 4;
}

async function proceedToSetup() {
  try {
    // Store email in user store if provided
    if (telemetryEmail.value.trim()) {
      const currentUser = userStore.currentUser;
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          cloudAccountEmail: telemetryEmail.value.trim().toLowerCase(),
        };
        userStore.setUser(updatedUser);
      }
    }

    // Submit telemetry if user consented
    if (allowOneTimeTelemetry.value) {
      const telemetryCurrency = createTelemetryCurrency();
      const telemetryPayload = {
        username: username.value,
        currency: telemetryCurrency,
        ...(telemetryEmail.value.trim() && { email: telemetryEmail.value }),
      };

      // Submit telemetry (fire and forget - don't block on errors)
      authService.submitTelemetry(telemetryPayload).catch((error) => {
        console.error("Telemetry submission error (non-blocking):", error);
        // Silently fail - don't interrupt user flow
      });
    }

    // Move to setup step
    currentStep.value = 5;

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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  @media (min-width: 616px) {
    width: 600px;
    margin: 8px auto;
  }

  @media (max-width: 600px) {
    margin: 4px;
    border-radius: 8px;
  }
}

.onboarding-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 8px;

  @media (max-width: 600px) {
    padding: 4px;
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

  @media (max-width: 600px) {
    font-size: 18px;
    padding: 12px 8px;
  }

  .logo {
    margin-right: 8px;
    margin-bottom: 4px;
    width: 40px;
    height: 40px;

    @media (max-width: 600px) {
      width: 32px;
      height: 32px;
      margin-right: 6px;
    }
  }
}

.step-header {
  .step-title {
    text-align: center;
    font-size: 24px;
    font-weight: 500;

    @media (max-width: 600px) {
      font-size: 20px;
    }
  }

  .step-indicator {
    max-width: 300px;
    margin: 0 auto;

    @media (max-width: 600px) {
      max-width: 100%;
      padding: 0 8px;
    }
  }
}

.step-content {
  padding: 32px 24px;
  min-height: 400px;

  @media (max-width: 600px) {
    padding: 20px 12px;
    min-height: 350px;
  }
}

// Step 1 - Welcome
.welcome-section {
  width: 100%;
  height: 100%;

  .welcome-carousel {
    min-height: 400px;

    @media (max-width: 600px) {
      min-height: 350px;
    }

    :deep(.q-carousel__slide) {
      padding: 16px 8px;

      @media (max-width: 600px) {
        padding: 12px 4px;
      }
    }

    :deep(.q-carousel__navigation) {
      bottom: 8px;

      @media (max-width: 600px) {
        bottom: 4px;
      }
    }

    :deep(.q-carousel__arrow) {
      @media (max-width: 600px) {
        padding: 4px;
        font-size: 20px;
      }
    }
  }

  .slide-content {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    padding: 0 8px;

    @media (max-width: 600px) {
      padding: 0 4px;
    }
  }

  .welcome-slide-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 20px 0;

    @media (max-width: 600px) {
      padding: 16px 0;
    }
  }

  .welcome-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    margin-bottom: 8px;

    @media (max-width: 600px) {
      width: 100px;
      height: 100px;
    }
  }

  .welcome-title {
    font-weight: 600;
    color: var(--q-primary);
  }

  .welcome-message {
    max-width: 400px;
    line-height: 1.6;
    color: rgb(72, 75, 132);

    @media (max-width: 600px) {
      max-width: 100%;
      padding: 0 8px;
    }
  }

  .feature-list {
    width: 100%;
    max-width: 450px;
    margin: 0 auto;

    .feature-item {
      display: flex;
      align-items: flex-start;
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 8px;
      background-color: rgba(0, 0, 0, 0.02);
      transition: background-color 0.2s;

      @media (max-width: 600px) {
        padding: 10px;
        margin-bottom: 12px;
      }

      .feature-icon {
        margin-top: 2px;
        flex-shrink: 0;
        margin-right: 12px;

        @media (max-width: 600px) {
          margin-right: 10px;
        }
      }

      .feature-content {
        flex: 1;
      }
    }
  }

  .upgrade-options {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
  }

  .upgrade-list {
    list-style: none;
    padding: 0;
    margin: 16px 0;

    @media (max-width: 600px) {
      margin: 12px 0;
    }

    li {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
      padding: 8px;
      border-radius: 6px;
      background-color: rgba(0, 0, 0, 0.02);

      @media (max-width: 600px) {
        margin-bottom: 10px;
        padding: 6px;
        font-size: 14px;
      }

      .q-icon {
        margin-top: 2px;
        flex-shrink: 0;
      }
    }
  }

  .upgrade-note {
    width: 100%;
    margin-top: 24px;
    padding: 16px;
    border-radius: 8px;
    background-color: rgba(118, 75, 162, 0.05);
    border-left: 3px solid var(--q-primary);

    @media (max-width: 600px) {
      margin-top: 20px;
      padding: 12px;
    }

    .upgrade-note-content {
      display: flex;
      align-items: flex-start;
      gap: 8px;

      .q-icon {
        flex-shrink: 0;
        margin-top: 2px;
      }
    }
  }
}

// Step 2 - Username
.username-section {
  max-width: 400px;
  margin: 0 auto;
  width: 100%;

  .text-h6 {
    @media (max-width: 600px) {
      font-size: 18px;
    }
  }

  .username-form {
    .q-input {
      margin-bottom: 16px;

      @media (max-width: 600px) {
        margin-bottom: 12px;
        font-size: 16px; // Prevents zoom on iOS
      }
    }
  }

  .username-requirements {
    margin-top: 16px;

    @media (max-width: 600px) {
      margin-top: 12px;
    }

    .requirement-list {
      .requirement-item {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        padding: 8px 12px;
        border-radius: 4px;
        transition: all 0.2s ease;
        min-height: 44px; // Touch target size

        @media (max-width: 600px) {
          padding: 6px 10px;
          margin-bottom: 6px;
          font-size: 14px;
        }

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
  width: 100%;

  .text-h6 {
    @media (max-width: 600px) {
      font-size: 18px;
    }
  }

  .currency-form {
    .q-select {
      margin-bottom: 16px;

      @media (max-width: 600px) {
        margin-bottom: 12px;
        font-size: 16px; // Prevents zoom on iOS
      }
    }
  }

  .custom-currency-section {
    padding: 16px;
    background-color: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid var(--q-primary);

    @media (max-width: 600px) {
      padding: 12px;
    }

    .q-input {
      margin-bottom: 16px;
      font-size: 16px; // Prevents zoom on iOS

      @media (max-width: 600px) {
        margin-bottom: 12px;
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

// Step 4 - Telemetry
.telemetry-section {
  max-width: 500px;
  margin: 0 auto;
  width: 100%;

  .text-h6 {
    @media (max-width: 600px) {
      font-size: 18px;
    }
  }

  .telemetry-form {
    .q-input {
      margin-bottom: 16px;
      font-size: 16px; // Prevents zoom on iOS

      @media (max-width: 600px) {
        margin-bottom: 12px;
      }
    }

    .q-checkbox {
      min-height: 44px; // Touch target size

      @media (max-width: 600px) {
        font-size: 14px;
      }
    }
  }
}

// Step 5 - Setup
.setup-section {
  text-align: center;
  width: 100%;

  .text-h6 {
    @media (max-width: 600px) {
      font-size: 18px;
    }
  }

  .progress-display {
    .progress-message {
      max-width: 300px;
      margin: 0 auto;

      @media (max-width: 600px) {
        max-width: 100%;
        padding: 0 8px;
      }
    }
  }

  .setup-complete {
    .completion-summary {
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-top: 16px;

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 12px;
        }

        .summary-item {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          border-radius: 6px;
          text-align: left;
          min-height: 44px; // Touch target size

          @media (max-width: 600px) {
            padding: 8px 10px;
            font-size: 14px;
          }

          .q-icon {
            margin-right: 8px;
            flex-shrink: 0;
          }
        }
      }
    }
  }
}

.step-actions {
  padding: 16px 24px;
  min-height: 60px; // Ensure consistent height

  @media (max-width: 600px) {
    padding: 12px 16px;
    flex-direction: column;
    gap: 12px;
  }

  .q-btn {
    font-weight: 500;
    min-height: 44px; // Touch target size

    @media (max-width: 600px) {
      width: 100%;
      font-size: 16px;
    }
  }

  // Reverse order on mobile: primary buttons first, back button last
  .primary-button {
    @media (max-width: 600px) {
      order: 1;
    }
  }

  .back-button {
    @media (max-width: 600px) {
      order: 2;
    }
  }

  .dashboard-button {
    margin-top: -20px;

    // Reset to normal size on desktop (remove md size effect)
    @media (min-width: 601px) {
      margin-top: 0px;
      min-height: 36px;
      padding: 8px 16px;
      font-size: 14px;
    }
  }

  .spacer {
    flex: 1;

    @media (max-width: 600px) {
      display: none;
    }
  }
}
</style>
