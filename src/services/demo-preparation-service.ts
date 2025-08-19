import { Collection } from "src/constants/constants";
import { Asset } from "src/models/asset";
import { Currency } from "src/models/currency";
import { Party } from "src/models/party";
import { Wallet } from "src/models/wallet";
import { RollingBudget } from "src/models/rolling-budget";
import { pouchdbService } from "./pouchdb-service";

class DemoPreparationService {
  // Class variables to store created entities
  private createdCurrencies: Currency[] = [];
  private createdWallets: Wallet[] = [];
  private createdParties: Party[] = [];
  private createdAssets: Asset[] = [];
  private createdBudgets: RollingBudget[] = [];

  /**
   * Setup additional demo currencies (complements whatever currency was chosen during onboarding)
   */
  async setupDemoCurrencies(): Promise<void> {
    // Get existing currencies to see what's already available
    const existingCurrencies = await pouchdbService.listByCollection(Collection.CURRENCY);

    // Define potential demo currencies
    const demoCurrencies: Currency[] = [
      {
        $collection: Collection.CURRENCY,
        name: "Bangladeshi Taka",
        sign: "৳",
        precisionMinimum: 2,
        precisionMaximum: 2,
      },
      {
        $collection: Collection.CURRENCY,
        name: "Euro",
        sign: "€",
        precisionMinimum: 2,
        precisionMaximum: 2,
      },
      {
        $collection: Collection.CURRENCY,
        name: "British Pound",
        sign: "£",
        precisionMinimum: 2,
        precisionMaximum: 2,
      },
      {
        $collection: Collection.CURRENCY,
        name: "Japanese Yen",
        sign: "¥",
        precisionMinimum: 0,
        precisionMaximum: 0,
      },
    ];

    // Filter out currencies that already exist
    const currenciesToCreate = demoCurrencies.filter((demoCurrency) => !existingCurrencies.docs.some((existing: any) => existing.sign === demoCurrency.sign));

    if (currenciesToCreate.length === 0) {
      console.log("All demo currencies already exist, skipping creation");
      return;
    }

    console.log(`Creating ${currenciesToCreate.length} additional demo currencies`);

    this.createdCurrencies = [];
    for (const currency of currenciesToCreate) {
      const result = await pouchdbService.upsertDoc(currency, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdCurrency = { ...currency, _id: result.id, _rev: result.rev };
      this.createdCurrencies.push(createdCurrency);
    }
  }

  /**
   * Setup additional demo wallets (complements onboarding wallets)
   */
  async setupDemoWallets(): Promise<void> {
    // Get existing wallets to avoid duplicates
    const existingWallets = await pouchdbService.listByCollection(Collection.WALLET);

    if (this.createdCurrencies.length === 0) {
      console.log("No additional currencies available, skipping wallet creation");
      return;
    }

    // Use the first available demo currency for wallets
    const demoCurrency = this.createdCurrencies[0];
    console.log(`Creating demo wallets using ${demoCurrency.name} (${demoCurrency.sign})`);

    // Create additional wallets that complement onboarding wallets
    const wallets: Wallet[] = [
      {
        $collection: Collection.WALLET,
        name: "Investment Account",
        type: "bank",
        initialBalance: 15000,
        currencyId: demoCurrency._id!,
        minimumBalance: 1000,
      },
      {
        $collection: Collection.WALLET,
        name: "Travel Fund",
        type: "bank",
        initialBalance: 3000,
        currencyId: demoCurrency._id!,
        minimumBalance: 0,
      },
    ];

    this.createdWallets = [];
    for (const wallet of wallets) {
      const result = await pouchdbService.upsertDoc(wallet, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdWallet = { ...wallet, _id: result.id, _rev: result.rev };
      this.createdWallets.push(createdWallet);
    }
  }

  /**
   * Setup additional demo parties (complements onboarding parties)
   */
  async setupDemoParties(): Promise<void> {
    // Get existing parties to avoid duplicates
    const existingParties = await pouchdbService.listByCollection(Collection.PARTY);

    // Create additional parties that complement onboarding parties
    const parties: Party[] = [
      {
        $collection: Collection.PARTY,
        name: "John Doe",
        type: "party",
      },
      {
        $collection: Collection.PARTY,
        name: "Jane Smith",
        type: "party",
      },
      {
        $collection: Collection.PARTY,
        name: "ABC Company",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "XYZ Corporation",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "Investment Broker",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "Travel Agency",
        type: "vendor",
      },
    ];

    this.createdParties = [];
    for (const party of parties) {
      const result = await pouchdbService.upsertDoc(party, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdParty = { ...party, _id: result.id, _rev: result.rev };
      this.createdParties.push(createdParty);
    }
  }

  /**
   * Setup additional demo assets (complements onboarding assets)
   */
  async setupDemoAssets(): Promise<void> {
    // Get existing assets to avoid duplicates
    const existingAssets = await pouchdbService.listByCollection(Collection.ASSET);

    if (this.createdCurrencies.length === 0) {
      console.log("No additional currencies available, skipping asset creation");
      return;
    }

    // Use the first available demo currency for assets
    const demoCurrency = this.createdCurrencies[0];
    console.log(`Creating demo assets using ${demoCurrency.name} (${demoCurrency.sign})`);

    // Create additional assets that complement onboarding assets
    const assets: Asset[] = [
      {
        $collection: Collection.ASSET,
        name: "Stock Portfolio",
        type: "investment",
        liquidity: "high",
        initialBalance: 10000,
        currencyId: demoCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Gold Investment",
        type: "investment",
        liquidity: "moderate",
        initialBalance: 5000,
        currencyId: demoCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Fixed Deposit",
        type: "long-term-deposit",
        liquidity: "low",
        initialBalance: 25000,
        currencyId: demoCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Mutual Fund",
        type: "investment",
        liquidity: "moderate",
        initialBalance: 15000,
        currencyId: demoCurrency._id!,
      },
    ];

    this.createdAssets = [];
    for (const asset of assets) {
      const result = await pouchdbService.upsertDoc(asset, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdAsset = { ...asset, _id: result.id, _rev: result.rev };
      this.createdAssets.push(createdAsset);
    }
  }

  /**
   * Setup demo budgets (monthly and travel)
   */
  async setupDemoBudgets(): Promise<void> {
    if (this.createdCurrencies.length === 0) {
      console.log("No additional currencies available, skipping budget creation");
      return;
    }

    // Use the first available demo currency for budgets
    const demoCurrency = this.createdCurrencies[0];
    console.log(`Creating demo budgets using ${demoCurrency.name} (${demoCurrency.sign})`);

    // Get current date for budget periods
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentWeek = new Date(now);
    currentWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)

    // Monthly Budget
    const monthlyBudget: RollingBudget = {
      $collection: Collection.ROLLING_BUDGET,
      name: "Monthly Budget",
      includeExpenses: true,
      includeAssetPurchases: false,
      tagIdWhiteList: [],
      tagIdBlackList: [],
      frequency: "monthly",
      budgetedPeriodList: [
        {
          startEpoch: currentMonth.getTime(),
          endEpoch: new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime(),
          title: `${currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
          allocatedAmount: 5000,
          rolledOverAmount: 0,
          totalAllocatedAmount: 5000,
          heldAmount: 0,
          usedAmount: 0,
          remainingAmount: 5000,
          calculatedEpoch: Date.now(),
        },
      ],
      rollOverRule: "positive-only",
      isFeatured: true,
      currencyId: demoCurrency._id!,
      monthlyStartDate: 1, // Start on 1st of month
      monthlyEndDate: 31, // End on last day of month
    };

    // Travel Budget (Weekly)
    const travelBudget: RollingBudget = {
      $collection: Collection.ROLLING_BUDGET,
      name: "Travel Budget",
      includeExpenses: true,
      includeAssetPurchases: false,
      tagIdWhiteList: [],
      tagIdBlackList: [],
      frequency: "irregular",
      budgetedPeriodList: [
        {
          startEpoch: currentWeek.getTime(),
          endEpoch: new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000).getTime(),
          title: `Week of ${currentWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          allocatedAmount: 1000,
          rolledOverAmount: 0,
          totalAllocatedAmount: 1000,
          heldAmount: 0,
          usedAmount: 0,
          remainingAmount: 1000,
          calculatedEpoch: Date.now(),
        },
      ],
      rollOverRule: "never",
      isFeatured: false,
      currencyId: demoCurrency._id!,
    };

    // Create budgets
    this.createdBudgets = [];
    const budgetsToCreate = [monthlyBudget, travelBudget];

    for (const budget of budgetsToCreate) {
      const result = await pouchdbService.upsertDoc(budget, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdBudget = { ...budget, _id: result.id, _rev: result.rev };
      this.createdBudgets.push(createdBudget);
    }
  }

  /**
   * Setup additional demo data (complements onboarding data)
   */
  async setupAllDemoData(): Promise<void> {
    console.log("Starting additional demo data setup...");

    // Create additional currencies first (complements whatever was chosen during onboarding)
    console.log("Creating additional demo currencies...");
    await this.setupDemoCurrencies();
    console.log(`Created ${this.createdCurrencies.length} additional currencies`);

    // Create additional wallets (complements onboarding wallets)
    console.log("Creating additional demo wallets...");
    await this.setupDemoWallets();
    console.log(`Created ${this.createdWallets.length} additional wallets`);

    // Create additional parties (complements onboarding parties)
    console.log("Creating additional demo parties...");
    await this.setupDemoParties();
    console.log(`Created ${this.createdParties.length} additional parties`);

    // Create additional assets (complements onboarding assets)
    console.log("Creating additional demo assets...");
    await this.setupDemoAssets();
    console.log(`Created ${this.createdAssets.length} additional assets`);

    // Create demo budgets
    console.log("Creating demo budgets...");
    await this.setupDemoBudgets();
    console.log(`Created ${this.createdBudgets.length} additional budgets`);

    console.log("Additional demo data setup completed successfully!");
  }

  /**
   * Get all created demo entities
   */
  getCreatedEntities(): {
    currencies: Currency[];
    wallets: Wallet[];
    parties: Party[];
    assets: Asset[];
    budgets: RollingBudget[];
  } {
    return {
      currencies: this.createdCurrencies,
      wallets: this.createdWallets,
      parties: this.createdParties,
      assets: this.createdAssets,
      budgets: this.createdBudgets,
    };
  }

  /**
   * Get count of created demo entities
   */
  getCreatedEntitiesCount(): {
    currencies: number;
    wallets: number;
    parties: number;
    assets: number;
    budgets: number;
  } {
    return {
      currencies: this.createdCurrencies.length,
      wallets: this.createdWallets.length,
      parties: this.createdParties.length,
      assets: this.createdAssets.length,
      budgets: this.createdBudgets.length,
    };
  }

  /**
   * Clear all demo data
   */
  async clearAllDemoData(): Promise<void> {
    console.log("Starting demo data cleanup...");

    // Get all demo documents
    const collections = [Collection.CURRENCY, Collection.WALLET, Collection.PARTY, Collection.ASSET, Collection.ROLLING_BUDGET];

    for (const collection of collections) {
      const docs = await pouchdbService.listByCollection(collection);
      console.log(`Found ${docs.docs.length} documents in ${collection}`);

      // Only remove documents that are marked as demo data
      const demoDocs = docs.docs.filter((doc: any) => doc.isDemoData === true);
      console.log(`Found ${demoDocs.length} demo documents in ${collection}`);

      for (const doc of demoDocs) {
        await pouchdbService.removeDoc(doc, true);
      }
    }

    console.log("Demo data cleanup completed!");
  }
}

export const demoPreparationService = new DemoPreparationService();
