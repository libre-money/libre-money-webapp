import { User } from "src/models/user";
import { useUserStore } from "src/stores/user";
import { onboardingService } from "./onboarding-service";
import { demoPreparationService } from "./demo-preparation-service";
import { OFFLINE_DOMAIN, OFFLINE_SERVER_URL } from "src/constants/auth-constants";
import { Currency } from "src/models/currency";
import { Collection } from "src/constants/constants";
import { pouchdbService } from "./pouchdb-service";

const userStore = useUserStore();

export type DemoOnboardingProgress = {
  step: string;
  progress: number;
  message: string;
};

class DemoOnboardingService {
  /**
   * Creates a demo user
   */
  async createDemoUser(): Promise<User> {
    const user: User = {
      domain: OFFLINE_DOMAIN,
      serverUrl: OFFLINE_SERVER_URL,
      username: "demo",
      loginAt: Date.now(),
      isOfflineUser: true,
      isDemoUser: true,
      hasCompletedOnboarding: false,
    };

    userStore.setUser(user);
    return user;
  }

  /**
   * Clears all existing data to ensure a fresh demo experience
   */
  private async clearExistingData(): Promise<void> {
    try {
      const db = pouchdbService.getDb();

      // Get all documents (excluding design documents)
      const allDocs = await db.allDocs({ include_docs: true });

      // Delete all documents (skip design documents that start with _design)
      const deletePromises = allDocs.rows
        .filter((row) => row.doc && !row.id.startsWith("_design"))
        .map((row) => {
          if (row.doc) {
            return db.remove(row.doc);
          }
          return Promise.resolve();
        });

      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error clearing existing data:", error);
      // If clearing fails, try to continue anyway - the demo setup might still work
    }
  }

  /**
   * Sets up demo account with comprehensive demo data
   */
  async setupDemoAccount(progressCallback?: (progress: DemoOnboardingProgress) => void): Promise<void> {
    // Progress ranges:
    // 0-5%: Clearing existing data
    // 5-65%: Basic onboarding (setupDefaultAccounts)
    // 65-95%: Additional demo data (setupAllDemoData)
    // 95-100%: Finalization

    // Step 0: Clear existing data for fresh demo
    if (progressCallback) {
      progressCallback({
        step: "Preparing fresh demo environment...",
        progress: 0,
        message: "Preparing fresh demo environment...",
      });
    }
    await this.clearExistingData();

    if (progressCallback) {
      progressCallback({
        step: "Setting up demo account...",
        progress: 5,
        message: "Setting up demo account...",
      });
    }

    // Step 1: Set up basic accounts with default currency (USD for demo)
    // This must be called first as demo data expects offline onboarding to be completed
    const defaultCurrency: Currency = {
      $collection: Collection.CURRENCY,
      name: "US Dollar",
      sign: "USD",
      precisionMinimum: 2,
      precisionMaximum: 2,
    };

    // Use a delay to simulate work being done (200ms for demo - faster than normal onboarding)
    await onboardingService.setupDefaultAccounts(
      defaultCurrency,
      (progress) => {
        if (progressCallback) {
          // Map onboarding progress (0-100) to our range (5-65)
          const mappedProgress = 5 + (progress.progress * 60) / 100;
          progressCallback({
            step: progress.message,
            progress: mappedProgress,
            message: progress.message,
          });
        }
      },
      200 // 200ms delay to simulate work
    );

    // Step 2: Generate comprehensive demo data
    if (progressCallback) {
      progressCallback({
        step: "Generating demo transactions and data...",
        progress: 65,
        message: "Generating demo transactions and data...",
      });
    }

    // Simulate progress during demo data generation
    let demoProgress = 65;
    const demoProgressInterval = setInterval(() => {
      if (demoProgress < 95 && progressCallback) {
        demoProgress += 1;
        progressCallback({
          step: "Generating demo transactions and data...",
          progress: demoProgress,
          message: "Generating demo transactions and data...",
        });
      }
    }, 100);

    try {
      await demoPreparationService.setupAllDemoData();
    } finally {
      clearInterval(demoProgressInterval);
    }

    if (progressCallback) {
      progressCallback({
        step: "Finalizing demo setup...",
        progress: 95,
        message: "Finalizing demo setup...",
      });
    }

    if (progressCallback) {
      progressCallback({
        step: "Demo setup complete!",
        progress: 100,
        message: "Demo setup complete!",
      });
    }
  }

  /**
   * Completes the demo onboarding process
   */
  async completeDemoOnboarding(): Promise<void> {
    const currentUser = userStore.currentUser;
    if (currentUser) {
      currentUser.hasCompletedOnboarding = true;
      userStore.setUser(currentUser);
    }
  }
}

export const demoOnboardingService = new DemoOnboardingService();
