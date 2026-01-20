import { User } from "src/models/user";
import { useUserStore } from "src/stores/user";
import { useSettingsStore } from "src/stores/settings";
import { pouchdbService } from "./pouchdb-service";
import { Collection } from "src/constants/constants";
import { Currency } from "src/schemas/currency";
import { ExpenseAvenue } from "src/schemas/expense-avenue";
import { IncomeSource } from "src/schemas/income-source";
import { Wallet } from "src/schemas/wallet";
import { Asset } from "src/schemas/asset";
import { Party } from "src/schemas/party";
import { Tag } from "src/schemas/tag";
import { sleep } from "src/utils/misc-utils";
import { OFFLINE_DOMAIN, OFFLINE_SERVER_URL } from "src/constants/auth-constants";

const userStore = useUserStore();
const settingsStore = useSettingsStore();

export type OnboardingProgress = {
  step: string;
  progress: number;
  message: string;
};

class OnboardingService {
  /**
   * Creates an offline user with the given username
   */
  async createOfflineUser(username: string): Promise<User> {
    const user: User = {
      domain: OFFLINE_DOMAIN,
      serverUrl: OFFLINE_SERVER_URL,
      username,
      loginAt: Date.now(),
      isOfflineUser: true,
      hasCompletedOnboarding: false,
    };

    userStore.setUser(user);
    return user;
  }

  /**
   * Sets up default accounts and entities for offline user
   * @param selectedCurrency - Optional currency to use, defaults to USD
   * @param progressCallback - Optional callback for progress updates
   * @param delay - Optional delay in milliseconds to simulate work (default: 300ms)
   */
  async setupDefaultAccounts(selectedCurrency?: Currency, progressCallback?: (progress: OnboardingProgress) => void, delay = 300): Promise<void> {
    const steps = [
      { message: "Creating default currency...", weight: 10 },
      { message: "Setting up expense categories...", weight: 15 },
      { message: "Creating income sources...", weight: 10 },
      { message: "Setting up wallets...", weight: 15 },
      { message: "Creating sample assets...", weight: 10 },
      { message: "Adding common parties...", weight: 10 },
      { message: "Setting up tags...", weight: 10 },
      { message: "Finalizing setup...", weight: 20 },
    ];

    let currentProgress = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (progressCallback) {
        progressCallback({
          step: step.message,
          progress: currentProgress,
          message: step.message,
        });
      }

      await sleep(delay); // Simulate work being done

      switch (i) {
        case 0:
          await this.createDefaultCurrency(selectedCurrency);
          break;
        case 1:
          await this.createDefaultExpenseAvenues();
          break;
        case 2:
          await this.createDefaultIncomeSources();
          break;
        case 3:
          await this.createDefaultWallets();
          break;
        case 4:
          await this.createDefaultAssets();
          break;
        case 5:
          await this.createDefaultParties();
          break;
        case 6:
          await this.createDefaultTags();
          break;
        case 7:
          await this.finalizeSetup();
          break;
      }

      currentProgress += step.weight;

      if (progressCallback) {
        progressCallback({
          step: step.message,
          progress: currentProgress,
          message: step.message,
        });
      }
    }
  }

  /**
   * Creates default currency or uses provided currency
   */
  private async createDefaultCurrency(providedCurrency?: Currency): Promise<void> {
    const defaultCurrency: Currency = providedCurrency || {
      $collection: Collection.CURRENCY,
      name: "US Dollar",
      sign: "USD",
      precisionMinimum: 2,
      precisionMaximum: 2,
    };

    // Ensure collection property is set
    if (!defaultCurrency.$collection) {
      defaultCurrency.$collection = Collection.CURRENCY;
    }

    const result = await pouchdbService.upsertDoc(defaultCurrency);

    // Update user with selected currency
    const currentUser = userStore.currentUser;
    if (currentUser) {
      currentUser.selectedCurrencyId = result.id;
      userStore.setUser(currentUser);
    }

    // Update settings store with default currency ID
    settingsStore.setDefaultCurrencyId(result.id);
  }

  /**
   * Creates default expense avenues
   */
  private async createDefaultExpenseAvenues(): Promise<void> {
    const expenseAvenues = [
      { name: "Food & Dining", description: "Restaurants, groceries, food delivery" },
      { name: "Transportation", description: "Gas, public transit, rideshare, maintenance" },
      { name: "Shopping", description: "Clothing, electronics, household items" },
      { name: "Entertainment", description: "Movies, games, subscriptions, hobbies" },
      { name: "Bills & Utilities", description: "Electricity, water, internet, phone" },
      { name: "Healthcare", description: "Medical expenses, insurance, pharmacy" },
      { name: "Education", description: "Courses, books, training, school fees" },
      { name: "Personal Care", description: "Haircuts, cosmetics, wellness" },
      { name: "Travel", description: "Flights, hotels, vacation expenses" },
      { name: "Miscellaneous", description: "Other uncategorized expenses" },
    ];

    for (const avenue of expenseAvenues) {
      const expenseAvenue: ExpenseAvenue = {
        $collection: Collection.EXPENSE_AVENUE,
        name: avenue.name,
      };
      await pouchdbService.upsertDoc(expenseAvenue);
    }
  }

  /**
   * Creates default income sources
   */
  private async createDefaultIncomeSources(): Promise<void> {
    const incomeSources = [
      { name: "Salary", description: "Primary employment income" },
      { name: "Freelance", description: "Freelance and contract work" },
      { name: "Business", description: "Business and entrepreneurship income" },
      { name: "Investments", description: "Dividends, interest, capital gains" },
      { name: "Side Hustle", description: "Part-time work and side projects" },
      { name: "Gifts & Bonuses", description: "Gifts, bonuses, windfalls" },
      { name: "Other Income", description: "Miscellaneous income sources" },
    ];

    for (const source of incomeSources) {
      const incomeSource: IncomeSource = {
        $collection: Collection.INCOME_SOURCE,
        name: source.name,
      };
      await pouchdbService.upsertDoc(incomeSource);
    }
  }

  /**
   * Creates default wallets
   */
  private async createDefaultWallets(): Promise<void> {
    const wallets = [
      { name: "Cash", type: "cash", description: "Physical cash on hand" },
      { name: "Checking Account", type: "bank", description: "Primary checking account" },
      { name: "Savings Account", type: "bank", description: "Savings and emergency fund" },
      { name: "Credit Card", type: "credit-card", description: "Primary credit card" },
    ];

    for (const wallet of wallets) {
      const walletDoc: Wallet = {
        $collection: Collection.WALLET,
        name: wallet.name,
        type: wallet.type,
        initialBalance: 0,
        currencyId: userStore.currentUser?.selectedCurrencyId || "",
      };
      await pouchdbService.upsertDoc(walletDoc);
    }
  }

  /**
   * Creates default assets
   */
  private async createDefaultAssets(): Promise<void> {
    const assets = [
      { name: "Emergency Fund", type: "investment", liquidity: "high", description: "Emergency savings fund" },
      { name: "Retirement Fund", type: "investment", liquidity: "low", description: "Long-term retirement savings" },
      { name: "House", type: "property", liquidity: "low", description: "Primary residence" },
      { name: "Car", type: "property", liquidity: "moderate", description: "Personal vehicle" },
    ];

    for (const asset of assets) {
      const assetDoc: Asset = {
        $collection: Collection.ASSET,
        name: asset.name,
        type: asset.type,
        liquidity: asset.liquidity,
        initialBalance: 0,
        currencyId: userStore.currentUser?.selectedCurrencyId || "",
      };
      await pouchdbService.upsertDoc(assetDoc);
    }
  }

  /**
   * Creates default parties
   */
  private async createDefaultParties(): Promise<void> {
    const parties = [
      { name: "Grocery Store", type: "vendor", description: "Local grocery store" },
      { name: "Gas Station", type: "vendor", description: "Fuel and convenience" },
      { name: "Restaurant", type: "vendor", description: "Dining establishments" },
      { name: "Online Store", type: "vendor", description: "E-commerce purchases" },
      { name: "Employer", type: "party", description: "Primary employer" },
      { name: "Bank", type: "party", description: "Financial institution" },
    ];

    for (const party of parties) {
      const partyDoc: Party = {
        $collection: Collection.PARTY,
        name: party.name,
        type: party.type,
      };
      await pouchdbService.upsertDoc(partyDoc);
    }
  }

  /**
   * Creates default tags
   */
  private async createDefaultTags(): Promise<void> {
    const tags = [
      { name: "Essential", color: "#4CAF50", description: "Necessary expenses" },
      { name: "Luxury", color: "#FF9800", description: "Non-essential purchases" },
      { name: "Investment", color: "#2196F3", description: "Long-term investments" },
      { name: "Emergency", color: "#F44336", description: "Emergency expenses" },
      { name: "Work Related", color: "#9C27B0", description: "Work and business expenses" },
      { name: "Personal", color: "#607D8B", description: "Personal expenses" },
    ];

    for (const tag of tags) {
      const tagDoc: Tag = {
        $collection: Collection.TAG,
        name: tag.name,
        color: tag.color,
      };
      await pouchdbService.upsertDoc(tagDoc);
    }
  }

  /**
   * Finalizes the setup process
   */
  private async finalizeSetup(): Promise<void> {
    // Additional setup tasks can be added here
    await sleep(500);
  }

  /**
   * Completes the onboarding process
   */
  async completeOnboarding(): Promise<void> {
    const currentUser = userStore.currentUser;
    if (currentUser) {
      currentUser.hasCompletedOnboarding = true;
      userStore.setUser(currentUser);
    }
  }
}

export const onboardingService = new OnboardingService();
