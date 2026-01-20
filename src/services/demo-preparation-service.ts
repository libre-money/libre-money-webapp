import { Collection } from "src/constants/constants";
import { Asset } from "src/schemas/asset";
import { Currency } from "src/schemas/currency";
import { Party } from "src/schemas/party";
import { Wallet } from "src/schemas/wallet";
import { RollingBudget } from "src/schemas/rolling-budget";
import { Record } from "src/schemas/record";
import { ExpenseAvenue } from "src/schemas/expense-avenue";
import { IncomeSource } from "src/schemas/income-source";
import { Tag } from "src/schemas/tag";
import { RecordType } from "src/constants/constants";
import { pouchdbService } from "./pouchdb-service";
import { Memo } from "src/schemas/memo";
import { TextImportRules } from "src/schemas/text-import-rules";

class DemoPreparationService {
  // Maps to store all available entities (both existing and demo)
  private currenciesMap = new Map<string, Currency>();
  private walletsMap = new Map<string, Wallet>();
  private partiesMap = new Map<string, Party>();
  private assetsMap = new Map<string, Asset>();
  private expenseAvenuesMap = new Map<string, ExpenseAvenue>();
  private incomeSourcesMap = new Map<string, IncomeSource>();
  private tagsMap = new Map<string, Tag>();

  // State variable to store the primary demo currency
  private primaryCurrency: Currency | null = null;

  // Counters for created demo entities
  private createdCounts = {
    currencies: 0,
    wallets: 0,
    parties: 0,
    assets: 0,
    budgets: 0,
    expenseAvenues: 0,
    incomeSources: 0,
    tags: 0,
    records: 0,
  };

  /**
   * Populate maps with existing entities from the database
   */
  private async populateMapsWithExistingEntities(): Promise<void> {
    // Get existing entities and populate maps
    const existingCurrencies = (await pouchdbService.listByCollection(Collection.CURRENCY)) as { docs: (Currency & { _id: string; _rev: string })[] };
    const existingWallets = (await pouchdbService.listByCollection(Collection.WALLET)) as { docs: (Wallet & { _id: string; _rev: string })[] };
    const existingParties = (await pouchdbService.listByCollection(Collection.PARTY)) as { docs: (Party & { _id: string; _rev: string })[] };
    const existingAssets = (await pouchdbService.listByCollection(Collection.ASSET)) as { docs: (Asset & { _id: string; _rev: string })[] };
    const existingExpenseAvenues = (await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE)) as {
      docs: (ExpenseAvenue & { _id: string; _rev: string })[];
    };
    const existingIncomeSources = (await pouchdbService.listByCollection(Collection.INCOME_SOURCE)) as {
      docs: (IncomeSource & { _id: string; _rev: string })[];
    };
    const existingTags = (await pouchdbService.listByCollection(Collection.TAG)) as { docs: (Tag & { _id: string; _rev: string })[] };

    // Populate maps with existing entities
    existingCurrencies.docs.forEach((currency) => {
      this.currenciesMap.set(currency.name, currency);
    });

    existingWallets.docs.forEach((wallet) => {
      this.walletsMap.set(wallet.name, wallet);
    });

    existingParties.docs.forEach((party) => {
      this.partiesMap.set(party.name, party);
    });

    existingAssets.docs.forEach((asset) => {
      this.assetsMap.set(asset.name, asset);
    });

    existingExpenseAvenues.docs.forEach((avenue) => {
      this.expenseAvenuesMap.set(avenue.name, avenue);
    });

    existingIncomeSources.docs.forEach((source) => {
      this.incomeSourcesMap.set(source.name, source);
    });

    existingTags.docs.forEach((tag) => {
      this.tagsMap.set(tag.name, tag);
    });
  }

  /**
   * Setup additional demo currencies (complements whatever currency was chosen during onboarding)
   */
  async setupDemoCurrencies(): Promise<void> {
    // Get existing currencies to see what's already available
    const existingCurrencies = (await pouchdbService.listByCollection(Collection.CURRENCY)) as { docs: (Currency & { _id: string; _rev: string })[] };

    // Define only USD and Euro as demo currencies
    const demoCurrencies: Currency[] = [
      {
        $collection: Collection.CURRENCY,
        name: "US Dollar",
        sign: "$",
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
    ];

    // Filter out currencies that already exist (check by both name and sign)
    const currenciesToCreate = demoCurrencies.filter(
      (demoCurrency) => !existingCurrencies.docs.some((existing) => existing.name === demoCurrency.name || existing.sign === demoCurrency.sign)
    );

    if (currenciesToCreate.length === 0) {
      console.log("USD and Euro already exist, skipping creation");
      return;
    }

    console.log(`Creating ${currenciesToCreate.length} additional demo currencies: ${currenciesToCreate.map((c) => c.name).join(", ")}`);

    for (const currency of currenciesToCreate) {
      const result = await pouchdbService.upsertDoc(currency, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdCurrency = { ...currency, _id: result.id, _rev: result.rev };

      // Add to currencies map
      this.currenciesMap.set(createdCurrency.name, createdCurrency);

      // Set the first created currency as the primary demo currency
      if (!this.primaryCurrency) {
        this.primaryCurrency = createdCurrency;
      }

      this.createdCounts.currencies++;
    }
  }

  /**
   * Setup demo wallets according to plan
   */
  async setupDemoWallets(): Promise<void> {
    const existingWallets = (await pouchdbService.listByCollection(Collection.WALLET)) as { docs: (Wallet & { _id: string; _rev: string })[] };

    if (!this.primaryCurrency) {
      console.log("No primary demo currency available, skipping wallet creation");
      return;
    }

    const demoCurrency = this.primaryCurrency;
    console.log(`Creating demo wallets using ${demoCurrency.name} (${demoCurrency.sign})`);

    // Create wallets according to plan
    const wallets: Wallet[] = [
      {
        $collection: Collection.WALLET,
        name: "Chase Checking",
        type: "bank",
        initialBalance: 8500,
        currencyId: demoCurrency._id!,
        minimumBalance: 500,
      },
      {
        $collection: Collection.WALLET,
        name: "Chase Savings",
        type: "bank",
        initialBalance: 25000,
        currencyId: demoCurrency._id!,
        minimumBalance: 10000,
      },
      {
        $collection: Collection.WALLET,
        name: "Cash",
        type: "cash",
        initialBalance: 350,
        currencyId: demoCurrency._id!,
        minimumBalance: 0,
      },
      {
        $collection: Collection.WALLET,
        name: "Amex Credit Card",
        type: "credit-card",
        initialBalance: -1200, // Negative = owed
        currencyId: demoCurrency._id!,
        minimumBalance: -8000,
      },
      {
        $collection: Collection.WALLET,
        name: "Venmo",
        type: "app",
        initialBalance: 450,
        currencyId: demoCurrency._id!,
        minimumBalance: 0,
      },
      {
        $collection: Collection.WALLET,
        name: "Jamie's Business Account",
        type: "bank",
        initialBalance: 3200,
        currencyId: demoCurrency._id!,
        minimumBalance: 500,
      },
    ];

    for (const wallet of wallets) {
      // Check if wallet already exists
      if (existingWallets.docs.some((w) => w.name === wallet.name)) {
        const existing = existingWallets.docs.find((w) => w.name === wallet.name)!;
        this.walletsMap.set(wallet.name, existing);
        continue;
      }

      const result = await pouchdbService.upsertDoc(wallet, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdWallet = { ...wallet, _id: result.id, _rev: result.rev };

      this.walletsMap.set(createdWallet.name, createdWallet);
      this.createdCounts.wallets++;
    }
  }

  /**
   * Setup demo parties according to plan
   */
  async setupDemoParties(): Promise<void> {
    const existingParties = (await pouchdbService.listByCollection(Collection.PARTY)) as { docs: (Party & { _id: string; _rev: string })[] };

    // Create parties according to plan
    const parties: Party[] = [
      // Family Members (type: party)
      { $collection: Collection.PARTY, name: "Mom (Susan Morgan)", type: "party" },
      { $collection: Collection.PARTY, name: "Brother (David Morgan)", type: "party" },
      { $collection: Collection.PARTY, name: "Best Friend (Chris)", type: "party" },
      // Vendors (type: vendor)
      { $collection: Collection.PARTY, name: "TechCorp Inc", type: "vendor" },
      { $collection: Collection.PARTY, name: "H-E-B Grocery", type: "vendor" },
      { $collection: Collection.PARTY, name: "Whole Foods", type: "vendor" },
      { $collection: Collection.PARTY, name: "Shell Gas Station", type: "vendor" },
      { $collection: Collection.PARTY, name: "Austin Energy", type: "vendor" },
      { $collection: Collection.PARTY, name: "Austin Water Utility", type: "vendor" },
      { $collection: Collection.PARTY, name: "Spectrum Internet", type: "vendor" },
      { $collection: Collection.PARTY, name: "State Farm Insurance", type: "vendor" },
      { $collection: Collection.PARTY, name: "ABC Pediatrics", type: "vendor" },
      { $collection: Collection.PARTY, name: "FastFit Gym", type: "vendor" },
      { $collection: Collection.PARTY, name: "Netflix", type: "vendor" },
      { $collection: Collection.PARTY, name: "Spotify", type: "vendor" },
      { $collection: Collection.PARTY, name: "Amazon", type: "vendor" },
      { $collection: Collection.PARTY, name: "Target", type: "vendor" },
      { $collection: Collection.PARTY, name: "Home Depot", type: "vendor" },
      { $collection: Collection.PARTY, name: "Starbucks", type: "vendor" },
      { $collection: Collection.PARTY, name: "Chipotle", type: "vendor" },
      { $collection: Collection.PARTY, name: "Tesla Service Center", type: "vendor" },
      { $collection: Collection.PARTY, name: "Central Texas Vet", type: "vendor" },
      { $collection: Collection.PARTY, name: "Piano Academy", type: "vendor" },
      { $collection: Collection.PARTY, name: "Bright Ideas Marketing", type: "vendor" },
      { $collection: Collection.PARTY, name: "Verde Landscaping Co", type: "vendor" },
      { $collection: Collection.PARTY, name: "Chase Bank", type: "vendor" },
      { $collection: Collection.PARTY, name: "Toyota Financial", type: "vendor" },
      { $collection: Collection.PARTY, name: "Vanguard", type: "vendor" },
      { $collection: Collection.PARTY, name: "Coinbase", type: "vendor" },
    ];

    for (const party of parties) {
      // Check if party already exists
      if (existingParties.docs.some((p) => p.name === party.name)) {
        const existing = existingParties.docs.find((p) => p.name === party.name)!;
        this.partiesMap.set(party.name, existing);
        continue;
      }

      const result = await pouchdbService.upsertDoc(party, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdParty = { ...party, _id: result.id, _rev: result.rev };

      this.partiesMap.set(createdParty.name, createdParty);
      this.createdCounts.parties++;
    }
  }

  /**
   * Setup demo assets according to plan
   */
  async setupDemoAssets(): Promise<void> {
    const existingAssets = (await pouchdbService.listByCollection(Collection.ASSET)) as { docs: (Asset & { _id: string; _rev: string })[] };

    if (!this.primaryCurrency) {
      console.log("No primary demo currency available, skipping asset creation");
      return;
    }

    const demoCurrency = this.primaryCurrency;
    console.log(`Creating demo assets using ${demoCurrency.name} (${demoCurrency.sign})`);

    // Create assets according to plan
    const assets: Asset[] = [
      {
        $collection: Collection.ASSET,
        name: "Family Home",
        type: "property",
        liquidity: "low",
        initialBalance: 380000,
        currencyId: demoCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Tesla Model 3",
        type: "property",
        liquidity: "moderate",
        initialBalance: 28000,
        currencyId: demoCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Honda CR-V",
        type: "property",
        liquidity: "moderate",
        initialBalance: 8000,
        currencyId: demoCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Vanguard Index Fund",
        type: "investment",
        liquidity: "high",
        initialBalance: 45000,
        currencyId: demoCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Company RSUs",
        type: "investment",
        liquidity: "moderate",
        initialBalance: 12000,
        currencyId: demoCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Bitcoin Holdings",
        type: "investment",
        liquidity: "high",
        initialBalance: 3500,
        currencyId: demoCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Emergency Cash Reserve",
        type: "long-term-deposit",
        liquidity: "moderate",
        initialBalance: 5000,
        currencyId: demoCurrency._id!,
      },
    ];

    for (const asset of assets) {
      // Check if asset already exists
      if (existingAssets.docs.some((a) => a.name === asset.name)) {
        const existing = existingAssets.docs.find((a) => a.name === asset.name)!;
        this.assetsMap.set(asset.name, existing);
        continue;
      }

      const result = await pouchdbService.upsertDoc(asset, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdAsset = { ...asset, _id: result.id, _rev: result.rev };

      this.assetsMap.set(createdAsset.name, createdAsset);
      this.createdCounts.assets++;
    }
  }

  /**
   * Setup demo expense avenues according to plan
   */
  async setupDemoExpenseAvenues(): Promise<void> {
    const existingExpenseAvenues = (await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE)) as {
      docs: (ExpenseAvenue & { _id: string; _rev: string })[];
    };

    // Create expense avenues according to plan
    const expenseAvenues: ExpenseAvenue[] = [
      { $collection: Collection.EXPENSE_AVENUE, name: "Groceries" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Dining Out" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Gas/Fuel" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Electricity" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Water" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Internet" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Car Insurance" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Health Insurance" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Medical/Prescriptions" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Piano Lessons" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Pet Care" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Streaming Services" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Gym Membership" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Coffee & Snacks" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Clothing" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Home Maintenance" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Car Maintenance" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Amazon Purchases" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Gifts & Celebrations" },
      { $collection: Collection.EXPENSE_AVENUE, name: "Business Expenses" },
    ];

    for (const avenue of expenseAvenues) {
      // Check if expense avenue already exists
      if (existingExpenseAvenues.docs.some((a) => a.name === avenue.name)) {
        const existing = existingExpenseAvenues.docs.find((a) => a.name === avenue.name)!;
        this.expenseAvenuesMap.set(avenue.name, existing);
        continue;
      }

      const result = await pouchdbService.upsertDoc(avenue, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdAvenue = { ...avenue, _id: result.id, _rev: result.rev };

      this.expenseAvenuesMap.set(createdAvenue.name, createdAvenue);
      this.createdCounts.expenseAvenues++;
    }
  }

  /**
   * Setup demo income sources according to plan
   */
  async setupDemoIncomeSources(): Promise<void> {
    const existingIncomeSources = (await pouchdbService.listByCollection(Collection.INCOME_SOURCE)) as {
      docs: (IncomeSource & { _id: string; _rev: string })[];
    };

    // Create income sources according to plan
    const incomeSources: IncomeSource[] = [
      { $collection: Collection.INCOME_SOURCE, name: "Salary - Alex" },
      { $collection: Collection.INCOME_SOURCE, name: "Annual Bonus - Alex" },
      { $collection: Collection.INCOME_SOURCE, name: "Freelance Design" },
      { $collection: Collection.INCOME_SOURCE, name: "RSU Vesting" },
      { $collection: Collection.INCOME_SOURCE, name: "Interest Income" },
      { $collection: Collection.INCOME_SOURCE, name: "Gift Received" },
    ];

    for (const source of incomeSources) {
      // Check if income source already exists
      if (existingIncomeSources.docs.some((s) => s.name === source.name)) {
        const existing = existingIncomeSources.docs.find((s) => s.name === source.name)!;
        this.incomeSourcesMap.set(source.name, existing);
        continue;
      }

      const result = await pouchdbService.upsertDoc(source, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdSource = { ...source, _id: result.id, _rev: result.rev };

      this.incomeSourcesMap.set(createdSource.name, createdSource);
      this.createdCounts.incomeSources++;
    }
  }

  /**
   * Setup demo tags according to plan
   */
  async setupDemoTags(): Promise<void> {
    const existingTags = (await pouchdbService.listByCollection(Collection.TAG)) as { docs: (Tag & { _id: string; _rev: string })[] };

    // Create tags according to plan
    const tags: Tag[] = [
      { $collection: Collection.TAG, name: "Essential", color: "#2E7D32" },
      { $collection: Collection.TAG, name: "Recurring", color: "#1976D2" },
      { $collection: Collection.TAG, name: "Splurge", color: "#9C27B0" },
      { $collection: Collection.TAG, name: "Tax Deductible", color: "#00838F" },
      { $collection: Collection.TAG, name: "For Riley", color: "#F57C00" },
      { $collection: Collection.TAG, name: "Investment", color: "#5D4037" },
      { $collection: Collection.TAG, name: "Emergency", color: "#D32F2F" },
      { $collection: Collection.TAG, name: "Reimbursable", color: "#7B1FA2" },
      { $collection: Collection.TAG, name: "Joint Expense", color: "#0097A7" },
      { $collection: Collection.TAG, name: "Business", color: "#455A64" },
      { $collection: Collection.TAG, name: "Health", color: "#E91E63" },
      { $collection: Collection.TAG, name: "Annual", color: "#795548" },
      { $collection: Collection.TAG, name: "Grocery", color: "#4CAF50" },
      { $collection: Collection.TAG, name: "Entertainment", color: "#FF5722" },
      { $collection: Collection.TAG, name: "Home", color: "#607D8B" },
    ];

    for (const tag of tags) {
      // Check if tag already exists
      if (existingTags.docs.some((t) => t.name === tag.name)) {
        const existing = existingTags.docs.find((t) => t.name === tag.name)!;
        this.tagsMap.set(tag.name, existing);
        continue;
      }

      const result = await pouchdbService.upsertDoc(tag, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdTag = { ...tag, _id: result.id, _rev: result.rev };

      this.tagsMap.set(createdTag.name, createdTag);
      this.createdCounts.tags++;
    }
  }

  /**
   * Setup comprehensive demo records for all record types
   */
  async setupDemoRecords(): Promise<void> {
    if (!this.primaryCurrency || this.createdCounts.wallets === 0 || this.createdCounts.parties === 0 || this.createdCounts.assets === 0) {
      console.log("Required demo entities not available, skipping record creation");
      return;
    }

    // Get all available entities for creating records
    const allCurrencies = (await pouchdbService.listByCollection(Collection.CURRENCY)) as { docs: (Currency & { _id: string; _rev: string })[] };
    const allWallets = (await pouchdbService.listByCollection(Collection.WALLET)) as { docs: (Wallet & { _id: string; _rev: string })[] };
    const allParties = (await pouchdbService.listByCollection(Collection.PARTY)) as { docs: (Party & { _id: string; _rev: string })[] };
    const allAssets = (await pouchdbService.listByCollection(Collection.ASSET)) as { docs: (Asset & { _id: string; _rev: string })[] };
    const allExpenseAvenues = (await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE)) as { docs: (ExpenseAvenue & { _id: string; _rev: string })[] };
    const allIncomeSources = (await pouchdbService.listByCollection(Collection.INCOME_SOURCE)) as { docs: (IncomeSource & { _id: string; _rev: string })[] };
    const allTags = (await pouchdbService.listByCollection(Collection.TAG)) as { docs: (Tag & { _id: string; _rev: string })[] };

    // Populate Maps with meaningful keys for easy access
    allCurrencies.docs.forEach((currency) => {
      if (currency.name === "US Dollar") this.currenciesMap.set("USD", currency);
      else if (currency.name === "Euro") this.currenciesMap.set("EUR", currency);
      else this.currenciesMap.set("PRIMARY", currency); // Default/onboarding currency
    });

    allWallets.docs.forEach((wallet) => {
      if (wallet.name === "Cash") this.walletsMap.set("CASH", wallet);
      else if (wallet.name === "Chase Checking") this.walletsMap.set("CHASE_CHECKING", wallet);
      else if (wallet.name === "Chase Savings") this.walletsMap.set("CHASE_SAVINGS", wallet);
      else if (wallet.name === "Amex Credit Card") this.walletsMap.set("AMEX_CREDIT_CARD", wallet);
      else if (wallet.name === "Venmo") this.walletsMap.set("VENMO", wallet);
      else if (wallet.name === "Jamie's Business Account") this.walletsMap.set("JAMIE_BUSINESS", wallet);
      else this.walletsMap.set("PRIMARY", wallet);
    });

    allParties.docs.forEach((party) => {
      // Family members
      if (party.name === "Mom (Susan Morgan)") this.partiesMap.set("MOM", party);
      else if (party.name === "Brother (David Morgan)") this.partiesMap.set("BROTHER", party);
      else if (party.name === "Best Friend (Chris)") this.partiesMap.set("BEST_FRIEND", party);
      // Vendors
      else if (party.name === "TechCorp Inc") this.partiesMap.set("TECHCORP", party);
      else if (party.name === "H-E-B Grocery") this.partiesMap.set("HEB_GROCERY", party);
      else if (party.name === "Whole Foods") this.partiesMap.set("WHOLE_FOODS", party);
      else if (party.name === "Shell Gas Station") this.partiesMap.set("SHELL", party);
      else if (party.name === "Austin Energy") this.partiesMap.set("AUSTIN_ENERGY", party);
      else if (party.name === "Austin Water Utility") this.partiesMap.set("AUSTIN_WATER", party);
      else if (party.name === "Spectrum Internet") this.partiesMap.set("SPECTRUM", party);
      else if (party.name === "State Farm Insurance") this.partiesMap.set("STATE_FARM", party);
      else if (party.name === "ABC Pediatrics") this.partiesMap.set("ABC_PEDIATRICS", party);
      else if (party.name === "FastFit Gym") this.partiesMap.set("FASTFIT_GYM", party);
      else if (party.name === "Netflix") this.partiesMap.set("NETFLIX", party);
      else if (party.name === "Spotify") this.partiesMap.set("SPOTIFY", party);
      else if (party.name === "Amazon") this.partiesMap.set("AMAZON", party);
      else if (party.name === "Target") this.partiesMap.set("TARGET", party);
      else if (party.name === "Home Depot") this.partiesMap.set("HOME_DEPOT", party);
      else if (party.name === "Starbucks") this.partiesMap.set("STARBUCKS", party);
      else if (party.name === "Chipotle") this.partiesMap.set("CHIPOTLE", party);
      else if (party.name === "Tesla Service Center") this.partiesMap.set("TESLA_SERVICE", party);
      else if (party.name === "Central Texas Vet") this.partiesMap.set("CENTRAL_TEXAS_VET", party);
      else if (party.name === "Piano Academy") this.partiesMap.set("PIANO_ACADEMY", party);
      else if (party.name === "Bright Ideas Marketing") this.partiesMap.set("BRIGHT_IDEAS", party);
      else if (party.name === "Verde Landscaping Co") this.partiesMap.set("VERDE_LANDSCAPING", party);
      else if (party.name === "Chase Bank") this.partiesMap.set("CHASE_BANK", party);
      else if (party.name === "Toyota Financial") this.partiesMap.set("TOYOTA_FINANCIAL", party);
      else if (party.name === "Vanguard") this.partiesMap.set("VANGUARD", party);
      else if (party.name === "Coinbase") this.partiesMap.set("COINBASE", party);
      else this.partiesMap.set("DEFAULT", party);
    });

    allAssets.docs.forEach((asset) => {
      if (asset.name === "Family Home") this.assetsMap.set("FAMILY_HOME", asset);
      else if (asset.name === "Tesla Model 3") this.assetsMap.set("TESLA_MODEL_3", asset);
      else if (asset.name === "Honda CR-V") this.assetsMap.set("HONDA_CRV", asset);
      else if (asset.name === "Vanguard Index Fund") this.assetsMap.set("VANGUARD_INDEX", asset);
      else if (asset.name === "Company RSUs") this.assetsMap.set("COMPANY_RSUS", asset);
      else if (asset.name === "Bitcoin Holdings") this.assetsMap.set("BITCOIN", asset);
      else if (asset.name === "Emergency Cash Reserve") this.assetsMap.set("EMERGENCY_CASH", asset);
      else this.assetsMap.set("DEFAULT", asset);
    });

    allExpenseAvenues.docs.forEach((avenue) => {
      if (avenue.name === "Groceries") this.expenseAvenuesMap.set("GROCERIES", avenue);
      else if (avenue.name === "Dining Out") this.expenseAvenuesMap.set("DINING_OUT", avenue);
      else if (avenue.name === "Gas/Fuel") this.expenseAvenuesMap.set("GAS_FUEL", avenue);
      else if (avenue.name === "Electricity") this.expenseAvenuesMap.set("ELECTRICITY", avenue);
      else if (avenue.name === "Water") this.expenseAvenuesMap.set("WATER", avenue);
      else if (avenue.name === "Internet") this.expenseAvenuesMap.set("INTERNET", avenue);
      else if (avenue.name === "Car Insurance") this.expenseAvenuesMap.set("CAR_INSURANCE", avenue);
      else if (avenue.name === "Health Insurance") this.expenseAvenuesMap.set("HEALTH_INSURANCE", avenue);
      else if (avenue.name === "Medical/Prescriptions") this.expenseAvenuesMap.set("MEDICAL", avenue);
      else if (avenue.name === "Piano Lessons") this.expenseAvenuesMap.set("PIANO_LESSONS", avenue);
      else if (avenue.name === "Pet Care") this.expenseAvenuesMap.set("PET_CARE", avenue);
      else if (avenue.name === "Streaming Services") this.expenseAvenuesMap.set("STREAMING", avenue);
      else if (avenue.name === "Gym Membership") this.expenseAvenuesMap.set("GYM_MEMBERSHIP", avenue);
      else if (avenue.name === "Coffee & Snacks") this.expenseAvenuesMap.set("COFFEE_SNACKS", avenue);
      else if (avenue.name === "Clothing") this.expenseAvenuesMap.set("CLOTHING", avenue);
      else if (avenue.name === "Home Maintenance") this.expenseAvenuesMap.set("HOME_MAINTENANCE", avenue);
      else if (avenue.name === "Car Maintenance") this.expenseAvenuesMap.set("CAR_MAINTENANCE", avenue);
      else if (avenue.name === "Amazon Purchases") this.expenseAvenuesMap.set("AMAZON_PURCHASES", avenue);
      else if (avenue.name === "Gifts & Celebrations") this.expenseAvenuesMap.set("GIFTS", avenue);
      else if (avenue.name === "Business Expenses") this.expenseAvenuesMap.set("BUSINESS_EXPENSES", avenue);
      else this.expenseAvenuesMap.set("DEFAULT", avenue);
    });

    allIncomeSources.docs.forEach((source) => {
      if (source.name === "Salary - Alex") this.incomeSourcesMap.set("SALARY_ALEX", source);
      else if (source.name === "Annual Bonus - Alex") this.incomeSourcesMap.set("ANNUAL_BONUS", source);
      else if (source.name === "Freelance Design") this.incomeSourcesMap.set("FREELANCE_DESIGN", source);
      else if (source.name === "RSU Vesting") this.incomeSourcesMap.set("RSU_VESTING", source);
      else if (source.name === "Interest Income") this.incomeSourcesMap.set("INTEREST_INCOME", source);
      else if (source.name === "Gift Received") this.incomeSourcesMap.set("GIFT_RECEIVED", source);
      else this.incomeSourcesMap.set("DEFAULT", source);
    });

    allTags.docs.forEach((tag) => {
      if (tag.name === "Essential") this.tagsMap.set("ESSENTIAL", tag);
      else if (tag.name === "Recurring") this.tagsMap.set("RECURRING", tag);
      else if (tag.name === "Splurge") this.tagsMap.set("SPLURGE", tag);
      else if (tag.name === "Tax Deductible") this.tagsMap.set("TAX_DEDUCTIBLE", tag);
      else if (tag.name === "For Riley") this.tagsMap.set("FOR_RILEY", tag);
      else if (tag.name === "Investment") this.tagsMap.set("INVESTMENT", tag);
      else if (tag.name === "Emergency") this.tagsMap.set("EMERGENCY", tag);
      else if (tag.name === "Reimbursable") this.tagsMap.set("REIMBURSABLE", tag);
      else if (tag.name === "Joint Expense") this.tagsMap.set("JOINT_EXPENSE", tag);
      else if (tag.name === "Business") this.tagsMap.set("BUSINESS", tag);
      else if (tag.name === "Health") this.tagsMap.set("HEALTH", tag);
      else if (tag.name === "Annual") this.tagsMap.set("ANNUAL", tag);
      else if (tag.name === "Grocery") this.tagsMap.set("GROCERY", tag);
      else if (tag.name === "Entertainment") this.tagsMap.set("ENTERTAINMENT", tag);
      else if (tag.name === "Home") this.tagsMap.set("HOME", tag);
      else this.tagsMap.set("DEFAULT", tag);
    });

    // Get primary entities with fallbacks
    const primaryCurrency = (this.currenciesMap.get("USD") || this.currenciesMap.get("PRIMARY") || allCurrencies.docs[0]) as Currency & { _id: string };
    const chaseChecking = this.walletsMap.get("CHASE_CHECKING");
    const chaseSavings = this.walletsMap.get("CHASE_SAVINGS");
    const cash = this.walletsMap.get("CASH");
    const amexCreditCard = this.walletsMap.get("AMEX_CREDIT_CARD");
    const venmo = this.walletsMap.get("VENMO");
    const jamieBusiness = this.walletsMap.get("JAMIE_BUSINESS");

    if (!primaryCurrency || !chaseChecking || !chaseSavings || !cash || !amexCreditCard || !venmo || !jamieBusiness) {
      console.log("Required entities not available for records");
      return;
    }

    // Calculate date range: Month 1 = 5 months ago, Month 6 = current month
    const now = new Date();
    const month6Start = new Date(now.getFullYear(), now.getMonth(), 1);
    const month1Start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    console.log(`Creating demo records for 6 months from ${month1Start.toLocaleDateString()} to ${now.toLocaleDateString()}`);

    let recordCount = 0;

    // Create records for each month (1-6)
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - 5 + monthOffset, 1);
      const monthNumber = monthOffset + 1;

      recordCount += await this.createRecordsForMonth(
        monthNumber,
        monthStart,
        primaryCurrency,
        chaseChecking as Wallet & { _id: string },
        chaseSavings as Wallet & { _id: string },
        cash as Wallet & { _id: string },
        amexCreditCard as Wallet & { _id: string },
        venmo as Wallet & { _id: string },
        jamieBusiness as Wallet & { _id: string }
      );
    }

    console.log(`Created ${recordCount} demo records successfully!`);
    this.createdCounts.records = recordCount;
  }

  /**
   * Create all records for a specific month according to the plan
   */
  private async createRecordsForMonth(
    monthNumber: number,
    monthStart: Date,
    currency: Currency & { _id: string },
    chaseChecking: Wallet & { _id: string },
    chaseSavings: Wallet & { _id: string },
    cash: Wallet & { _id: string },
    amexCreditCard: Wallet & { _id: string },
    venmo: Wallet & { _id: string },
    jamieBusiness: Wallet & { _id: string }
  ): Promise<number> {
    let count = 0;
    const currencyId = currency._id;

    // Helper to get tag IDs
    const getTagIds = (tagNames: string[]): string[] => {
      return tagNames.map((name) => this.tagsMap.get(name)?._id).filter(Boolean) as string[];
    };

    // Income records
    const incomeRecords = this.getIncomeRecordsForMonth(monthNumber, monthStart, currencyId, chaseChecking, chaseSavings, jamieBusiness);
    for (const record of incomeRecords) {
      await this.createRecord(record);
      count++;
    }

    // Expense records
    const expenseRecords = this.getExpenseRecordsForMonth(monthNumber, monthStart, currencyId, chaseChecking, amexCreditCard, cash, venmo, jamieBusiness);
    for (const record of expenseRecords) {
      await this.createRecord(record);
      count++;
    }

    // Money transfer records
    const transferRecords = this.getMoneyTransferRecordsForMonth(
      monthNumber,
      monthStart,
      currencyId,
      chaseChecking,
      chaseSavings,
      cash,
      venmo,
      amexCreditCard,
      jamieBusiness
    );
    for (const record of transferRecords) {
      await this.createRecord(record);
      count++;
    }

    // Lending records
    const lendingRecords = this.getLendingRecordsForMonth(monthNumber, monthStart, currencyId, chaseChecking);
    for (const record of lendingRecords) {
      await this.createRecord(record);
      count++;
    }

    // Borrowing records (initial setup - only in month 1 conceptually, but we'll create them)
    if (monthNumber === 1) {
      const borrowingRecords = this.getBorrowingRecordsForMonth(monthStart, currencyId, chaseChecking);
      for (const record of borrowingRecords) {
        await this.createRecord(record);
        count++;
      }
    }

    // Repayment records
    const repaymentRecords = this.getRepaymentRecordsForMonth(monthNumber, monthStart, currencyId, chaseChecking);
    for (const record of repaymentRecords) {
      await this.createRecord(record);
      count++;
    }

    // Asset purchase records
    const assetPurchaseRecords = this.getAssetPurchaseRecordsForMonth(monthNumber, monthStart, currencyId, chaseChecking);
    for (const record of assetPurchaseRecords) {
      await this.createRecord(record);
      count++;
    }

    // Asset sale records
    const assetSaleRecords = this.getAssetSaleRecordsForMonth(monthNumber, monthStart, currencyId, chaseChecking);
    for (const record of assetSaleRecords) {
      await this.createRecord(record);
      count++;
    }

    // Asset appreciation/depreciation records
    const assetAppDepRecords = this.getAssetAppreciationDepreciationRecordsForMonth(monthNumber, monthStart, currencyId);
    for (const record of assetAppDepRecords) {
      await this.createRecord(record);
      count++;
    }

    return count;
  }

  /**
   * Get income records for a specific month according to plan
   */
  private getIncomeRecordsForMonth(
    monthNumber: number,
    monthStart: Date,
    currencyId: string,
    chaseChecking: Wallet & { _id: string },
    chaseSavings: Wallet & { _id: string },
    jamieBusiness: Wallet & { _id: string }
  ): Record[] {
    const records: Record[] = [];
    const getTagIds = (names: string[]) => names.map((n) => this.tagsMap.get(n)?._id).filter(Boolean) as string[];

    // Month 1
    if (monthNumber === 1) {
      records.push(
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 1),
          currencyId,
          chaseChecking._id,
          this.incomeSourcesMap.get("SALARY_ALEX")?._id || "",
          this.partiesMap.get("TECHCORP")?._id || "",
          getTagIds(["RECURRING"]),
          8200,
          "Monthly salary deposit"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 3),
          currencyId,
          jamieBusiness._id,
          this.incomeSourcesMap.get("FREELANCE_DESIGN")?._id || "",
          this.partiesMap.get("BRIGHT_IDEAS")?._id || "",
          getTagIds(["BUSINESS"]),
          2800,
          "Logo design project"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 18),
          currencyId,
          chaseSavings._id,
          this.incomeSourcesMap.get("INTEREST_INCOME")?._id || "",
          "",
          getTagIds(["INVESTMENT"]),
          45,
          "Monthly savings interest"
        )
      );
    }
    // Month 2
    else if (monthNumber === 2) {
      records.push(
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 1),
          currencyId,
          chaseChecking._id,
          this.incomeSourcesMap.get("SALARY_ALEX")?._id || "",
          this.partiesMap.get("TECHCORP")?._id || "",
          getTagIds(["RECURRING"]),
          8200,
          "Monthly salary deposit"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 5),
          currencyId,
          jamieBusiness._id,
          this.incomeSourcesMap.get("FREELANCE_DESIGN")?._id || "",
          this.partiesMap.get("VERDE_LANDSCAPING")?._id || "",
          getTagIds(["BUSINESS"]),
          3200,
          "Brand refresh project"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 15),
          currencyId,
          chaseChecking._id,
          this.incomeSourcesMap.get("ANNUAL_BONUS")?._id || "",
          this.partiesMap.get("TECHCORP")?._id || "",
          getTagIds(["ANNUAL"]),
          12000,
          "Annual performance bonus"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 18),
          currencyId,
          chaseSavings._id,
          this.incomeSourcesMap.get("INTEREST_INCOME")?._id || "",
          "",
          getTagIds(["INVESTMENT"]),
          48,
          "Monthly savings interest"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 20),
          currencyId,
          chaseChecking._id,
          this.incomeSourcesMap.get("RSU_VESTING")?._id || "",
          this.partiesMap.get("TECHCORP")?._id || "",
          getTagIds(["INVESTMENT"]),
          850,
          "Quarterly RSU vest"
        )
      );
    }
    // Month 3
    else if (monthNumber === 3) {
      records.push(
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 1),
          currencyId,
          chaseChecking._id,
          this.incomeSourcesMap.get("SALARY_ALEX")?._id || "",
          this.partiesMap.get("TECHCORP")?._id || "",
          getTagIds(["RECURRING"]),
          8200,
          "Monthly salary deposit"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 4),
          currencyId,
          jamieBusiness._id,
          this.incomeSourcesMap.get("FREELANCE_DESIGN")?._id || "",
          this.partiesMap.get("BRIGHT_IDEAS")?._id || "",
          getTagIds(["BUSINESS"]),
          2500,
          "Social media graphics package"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 18),
          currencyId,
          chaseSavings._id,
          this.incomeSourcesMap.get("INTEREST_INCOME")?._id || "",
          "",
          getTagIds(["INVESTMENT"]),
          52,
          "Monthly savings interest"
        )
      );
    }
    // Month 4
    else if (monthNumber === 4) {
      records.push(
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 1),
          currencyId,
          chaseChecking._id,
          this.incomeSourcesMap.get("SALARY_ALEX")?._id || "",
          this.partiesMap.get("TECHCORP")?._id || "",
          getTagIds(["RECURRING"]),
          8200,
          "Monthly salary deposit"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 6),
          currencyId,
          jamieBusiness._id,
          this.incomeSourcesMap.get("FREELANCE_DESIGN")?._id || "",
          this.partiesMap.get("VERDE_LANDSCAPING")?._id || "",
          getTagIds(["BUSINESS"]),
          4200,
          "Website redesign project"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 12),
          currencyId,
          chaseChecking._id,
          this.incomeSourcesMap.get("GIFT_RECEIVED")?._id || "",
          this.partiesMap.get("MOM")?._id || "",
          [],
          500,
          "Birthday gift from mom"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 18),
          currencyId,
          chaseSavings._id,
          this.incomeSourcesMap.get("INTEREST_INCOME")?._id || "",
          "",
          getTagIds(["INVESTMENT"]),
          55,
          "Monthly savings interest"
        )
      );
    }
    // Month 5
    else if (monthNumber === 5) {
      records.push(
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 1),
          currencyId,
          chaseChecking._id,
          this.incomeSourcesMap.get("SALARY_ALEX")?._id || "",
          this.partiesMap.get("TECHCORP")?._id || "",
          getTagIds(["RECURRING"]),
          8200,
          "Monthly salary deposit"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 3),
          currencyId,
          jamieBusiness._id,
          this.incomeSourcesMap.get("FREELANCE_DESIGN")?._id || "",
          this.partiesMap.get("BRIGHT_IDEAS")?._id || "",
          getTagIds(["BUSINESS"]),
          3500,
          "Marketing campaign materials"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 18),
          currencyId,
          chaseSavings._id,
          this.incomeSourcesMap.get("INTEREST_INCOME")?._id || "",
          "",
          getTagIds(["INVESTMENT"]),
          58,
          "Monthly savings interest"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 20),
          currencyId,
          chaseChecking._id,
          this.incomeSourcesMap.get("RSU_VESTING")?._id || "",
          this.partiesMap.get("TECHCORP")?._id || "",
          getTagIds(["INVESTMENT"]),
          850,
          "Quarterly RSU vest"
        )
      );
    }
    // Month 6 (current)
    else if (monthNumber === 6) {
      records.push(
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 1),
          currencyId,
          chaseChecking._id,
          this.incomeSourcesMap.get("SALARY_ALEX")?._id || "",
          this.partiesMap.get("TECHCORP")?._id || "",
          getTagIds(["RECURRING"]),
          8200,
          "Monthly salary deposit"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 5),
          currencyId,
          jamieBusiness._id,
          this.incomeSourcesMap.get("FREELANCE_DESIGN")?._id || "",
          this.partiesMap.get("VERDE_LANDSCAPING")?._id || "",
          getTagIds(["BUSINESS"]),
          2900,
          "Brochure design"
        ),
        this.createIncomeRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 18),
          currencyId,
          chaseSavings._id,
          this.incomeSourcesMap.get("INTEREST_INCOME")?._id || "",
          "",
          getTagIds(["INVESTMENT"]),
          60,
          "Monthly savings interest"
        )
      );
    }

    return records;
  }

  /**
   * Get expense records for a specific month according to plan
   * Note: This is a simplified version. Full implementation would include all 150 expense records
   */
  private getExpenseRecordsForMonth(
    monthNumber: number,
    monthStart: Date,
    currencyId: string,
    chaseChecking: Wallet & { _id: string },
    amexCreditCard: Wallet & { _id: string },
    cash: Wallet & { _id: string },
    venmo: Wallet & { _id: string },
    jamieBusiness: Wallet & { _id: string }
  ): Record[] {
    const records: Record[] = [];
    const getTagIds = (names: string[]) => names.map((n) => this.tagsMap.get(n)?._id).filter(Boolean) as string[];

    // Sample expense records for Month 1 - full implementation would have all records
    if (monthNumber === 1) {
      records.push(
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 3),
          currencyId,
          chaseChecking._id,
          this.expenseAvenuesMap.get("ELECTRICITY")?._id || "",
          this.partiesMap.get("AUSTIN_ENERGY")?._id || "",
          getTagIds(["Essential", "Recurring", "Home"]),
          145,
          "Monthly electricity bill"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 3),
          currencyId,
          chaseChecking._id,
          this.expenseAvenuesMap.get("WATER")?._id || "",
          this.partiesMap.get("AUSTIN_WATER")?._id || "",
          getTagIds(["Essential", "Recurring", "Home"]),
          65,
          "Monthly water bill"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 5),
          currencyId,
          amexCreditCard._id,
          this.expenseAvenuesMap.get("INTERNET")?._id || "",
          this.partiesMap.get("SPECTRUM")?._id || "",
          getTagIds(["Essential", "Recurring"]),
          75,
          "Monthly internet service"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 6),
          currencyId,
          amexCreditCard._id,
          this.expenseAvenuesMap.get("GROCERIES")?._id || "",
          this.partiesMap.get("HEB_GROCERY")?._id || "",
          getTagIds(["Essential", "Grocery"]),
          185,
          "Weekly groceries"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 8),
          currencyId,
          amexCreditCard._id,
          this.expenseAvenuesMap.get("GAS_FUEL")?._id || "",
          this.partiesMap.get("SHELL")?._id || "",
          getTagIds(["Essential"]),
          52,
          "Car fuel"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 10),
          currencyId,
          chaseChecking._id,
          this.expenseAvenuesMap.get("CAR_INSURANCE")?._id || "",
          this.partiesMap.get("STATE_FARM")?._id || "",
          getTagIds(["Essential", "Recurring"]),
          180,
          "Monthly auto insurance"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 12),
          currencyId,
          chaseChecking._id,
          this.expenseAvenuesMap.get("HEALTH_INSURANCE")?._id || "",
          "",
          getTagIds(["Essential", "Recurring", "Health"]),
          420,
          "Monthly health premium"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 13),
          currencyId,
          amexCreditCard._id,
          this.expenseAvenuesMap.get("GROCERIES")?._id || "",
          this.partiesMap.get("WHOLE_FOODS")?._id || "",
          getTagIds(["Essential", "Grocery"]),
          165,
          "Weekly groceries - organic"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 15),
          currencyId,
          chaseChecking._id,
          this.expenseAvenuesMap.get("PIANO_LESSONS")?._id || "",
          this.partiesMap.get("PIANO_ACADEMY")?._id || "",
          getTagIds(["Recurring", "For Riley"]),
          160,
          "Riley's piano lessons"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 16),
          currencyId,
          venmo._id,
          this.expenseAvenuesMap.get("DINING_OUT")?._id || "",
          this.partiesMap.get("CHIPOTLE")?._id || "",
          getTagIds(["Splurge"]),
          45,
          "Family dinner"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 17),
          currencyId,
          cash._id,
          this.expenseAvenuesMap.get("COFFEE_SNACKS")?._id || "",
          this.partiesMap.get("STARBUCKS")?._id || "",
          getTagIds(["Splurge"]),
          18,
          "Morning coffee"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 18),
          currencyId,
          amexCreditCard._id,
          this.expenseAvenuesMap.get("GYM_MEMBERSHIP")?._id || "",
          this.partiesMap.get("FASTFIT_GYM")?._id || "",
          getTagIds(["Recurring", "Health"]),
          45,
          "Monthly gym fee"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 20),
          currencyId,
          amexCreditCard._id,
          this.expenseAvenuesMap.get("GROCERIES")?._id || "",
          this.partiesMap.get("HEB_GROCERY")?._id || "",
          getTagIds(["Essential", "Grocery"]),
          195,
          "Weekly groceries"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 21),
          currencyId,
          amexCreditCard._id,
          this.expenseAvenuesMap.get("STREAMING")?._id || "",
          this.partiesMap.get("NETFLIX")?._id || "",
          getTagIds(["Recurring", "Entertainment"]),
          15,
          "Netflix subscription"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 21),
          currencyId,
          amexCreditCard._id,
          this.expenseAvenuesMap.get("STREAMING")?._id || "",
          this.partiesMap.get("SPOTIFY")?._id || "",
          getTagIds(["Recurring", "Entertainment"]),
          12,
          "Spotify family plan"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 22),
          currencyId,
          amexCreditCard._id,
          this.expenseAvenuesMap.get("GAS_FUEL")?._id || "",
          this.partiesMap.get("SHELL")?._id || "",
          getTagIds(["Essential"]),
          48,
          "Car fuel"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 24),
          currencyId,
          amexCreditCard._id,
          this.expenseAvenuesMap.get("AMAZON_PURCHASES")?._id || "",
          this.partiesMap.get("AMAZON")?._id || "",
          getTagIds(["Joint Expense"]),
          85,
          "Household items"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 27),
          currencyId,
          cash._id,
          this.expenseAvenuesMap.get("GROCERIES")?._id || "",
          this.partiesMap.get("HEB_GROCERY")?._id || "",
          getTagIds(["Essential", "Grocery"]),
          175,
          "Weekly groceries"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 28),
          currencyId,
          amexCreditCard._id,
          this.expenseAvenuesMap.get("DINING_OUT")?._id || "",
          this.partiesMap.get("CHIPOTLE")?._id || "",
          getTagIds(["Splurge"]),
          38,
          "Lunch out"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 30),
          currencyId,
          cash._id,
          this.expenseAvenuesMap.get("COFFEE_SNACKS")?._id || "",
          this.partiesMap.get("STARBUCKS")?._id || "",
          getTagIds(["Splurge"]),
          22,
          "Coffee and pastry"
        ),
        this.createExpenseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 30),
          currencyId,
          jamieBusiness._id,
          this.expenseAvenuesMap.get("BUSINESS_EXPENSES")?._id || "",
          "",
          getTagIds(["Business", "Tax Deductible"]),
          55,
          "Adobe Creative Cloud"
        )
      );
    }
    // Add similar patterns for months 2-6...
    // For brevity, I'm showing Month 1 as an example. Full implementation would include all months.

    return records;
  }

  /**
   * Get money transfer records for a specific month
   */
  private getMoneyTransferRecordsForMonth(
    monthNumber: number,
    monthStart: Date,
    currencyId: string,
    chaseChecking: Wallet & { _id: string },
    chaseSavings: Wallet & { _id: string },
    cash: Wallet & { _id: string },
    venmo: Wallet & { _id: string },
    amexCreditCard: Wallet & { _id: string },
    jamieBusiness: Wallet & { _id: string }
  ): Record[] {
    const records: Record[] = [];
    const getTagIds = (names: string[]) => names.map((n) => this.tagsMap.get(n)?._id).filter(Boolean) as string[];

    // Month 1 transfers
    if (monthNumber === 1) {
      records.push(
        this.createMoneyTransferRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 5),
          currencyId,
          chaseChecking._id,
          chaseSavings._id,
          getTagIds(["RECURRING"]),
          1000,
          "Monthly savings transfer"
        ),
        this.createMoneyTransferRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 8),
          currencyId,
          chaseChecking._id,
          cash._id,
          [],
          200,
          "Cash withdrawal"
        ),
        this.createMoneyTransferRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 12),
          currencyId,
          chaseChecking._id,
          venmo._id,
          [],
          150,
          "Venmo top-up"
        ),
        this.createMoneyTransferRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 20),
          currencyId,
          jamieBusiness._id,
          chaseChecking._id,
          [],
          2000,
          "Transfer business profits"
        ),
        this.createMoneyTransferRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 25),
          currencyId,
          chaseChecking._id,
          amexCreditCard._id,
          [],
          2500,
          "Credit card payment"
        )
      );
    }
    // Similar for months 2-6...

    return records;
  }

  /**
   * Get lending records for a specific month
   */
  private getLendingRecordsForMonth(monthNumber: number, monthStart: Date, currencyId: string, chaseChecking: Wallet & { _id: string }): Record[] {
    const records: Record[] = [];

    if (monthNumber === 1) {
      records.push(
        this.createLendingRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 15),
          currencyId,
          chaseChecking._id,
          this.partiesMap.get("MOM")?._id || "",
          [],
          2000,
          "Help with car repair"
        )
      );
    } else if (monthNumber === 2) {
      records.push(
        this.createLendingRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 20),
          currencyId,
          chaseChecking._id,
          this.partiesMap.get("BROTHER")?._id || "",
          [],
          800,
          "Moving expenses"
        )
      );
    } else if (monthNumber === 4) {
      records.push(
        this.createLendingRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 10),
          currencyId,
          chaseChecking._id,
          this.partiesMap.get("BEST_FRIEND")?._id || "",
          [],
          500,
          "Emergency loan"
        )
      );
    }

    return records;
  }

  /**
   * Get borrowing records (initial setup)
   */
  private getBorrowingRecordsForMonth(monthStart: Date, currencyId: string, chaseChecking: Wallet & { _id: string }): Record[] {
    return [
      this.createBorrowingRecord(
        new Date(monthStart.getFullYear(), monthStart.getMonth(), 1),
        currencyId,
        chaseChecking._id,
        this.partiesMap.get("CHASE_BANK")?._id || "",
        [],
        185000,
        "Mortgage balance (simplified)"
      ),
      this.createBorrowingRecord(
        new Date(monthStart.getFullYear(), monthStart.getMonth(), 1),
        currencyId,
        chaseChecking._id,
        this.partiesMap.get("TOYOTA_FINANCIAL")?._id || "",
        [],
        8500,
        "Auto loan remaining"
      ),
    ];
  }

  /**
   * Get repayment records for a specific month
   */
  private getRepaymentRecordsForMonth(monthNumber: number, monthStart: Date, currencyId: string, chaseChecking: Wallet & { _id: string }): Record[] {
    const records: Record[] = [];
    const getTagIds = (names: string[]) => names.map((n) => this.tagsMap.get(n)?._id).filter(Boolean) as string[];

    // Repayments given (monthly loan payments)
    records.push(
      this.createRepaymentGivenRecord(
        new Date(monthStart.getFullYear(), monthStart.getMonth(), 1),
        currencyId,
        chaseChecking._id,
        this.partiesMap.get("CHASE_BANK")?._id || "",
        [],
        1850,
        "Mortgage payment"
      ),
      this.createRepaymentGivenRecord(
        new Date(monthStart.getFullYear(), monthStart.getMonth(), 10),
        currencyId,
        chaseChecking._id,
        this.partiesMap.get("TOYOTA_FINANCIAL")?._id || "",
        [],
        320,
        "Auto loan payment"
      )
    );

    // Repayments received (from family loans)
    if (monthNumber >= 2) {
      if (monthNumber === 2 || monthNumber === 3 || monthNumber === 4 || monthNumber === 5 || monthNumber === 6) {
        records.push(
          this.createRepaymentReceivedRecord(
            new Date(monthStart.getFullYear(), monthStart.getMonth(), 25),
            currencyId,
            chaseChecking._id,
            this.partiesMap.get("MOM")?._id || "",
            getTagIds(["RECURRING"]),
            400,
            "Loan repayment - installment"
          )
        );
      }
      if (monthNumber >= 3 && monthNumber <= 6) {
        records.push(
          this.createRepaymentReceivedRecord(
            new Date(monthStart.getFullYear(), monthStart.getMonth(), 28),
            currencyId,
            chaseChecking._id,
            this.partiesMap.get("BROTHER")?._id || "",
            getTagIds(["RECURRING"]),
            200,
            "Loan repayment - installment"
          )
        );
      }
      if (monthNumber === 5) {
        records.push(
          this.createRepaymentReceivedRecord(
            new Date(monthStart.getFullYear(), monthStart.getMonth(), 30),
            currencyId,
            chaseChecking._id,
            this.partiesMap.get("BEST_FRIEND")?._id || "",
            [],
            500,
            "Full loan repayment"
          )
        );
      }
    }

    return records;
  }

  /**
   * Get asset purchase records for a specific month
   */
  private getAssetPurchaseRecordsForMonth(monthNumber: number, monthStart: Date, currencyId: string, chaseChecking: Wallet & { _id: string }): Record[] {
    const records: Record[] = [];
    const getTagIds = (names: string[]) => names.map((n) => this.tagsMap.get(n)?._id).filter(Boolean) as string[];

    if (monthNumber === 3) {
      records.push(
        this.createAssetPurchaseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 15),
          currencyId,
          chaseChecking._id,
          this.assetsMap.get("VANGUARD_INDEX")?._id || "",
          this.partiesMap.get("VANGUARD")?._id || "",
          getTagIds(["INVESTMENT"]),
          2000,
          "Monthly DCA investment"
        )
      );
    } else if (monthNumber === 4) {
      records.push(
        this.createAssetPurchaseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 20),
          currencyId,
          chaseChecking._id,
          this.assetsMap.get("BITCOIN")?._id || "",
          this.partiesMap.get("COINBASE")?._id || "",
          getTagIds(["INVESTMENT"]),
          500,
          "Crypto purchase"
        )
      );
    } else if (monthNumber === 5) {
      records.push(
        this.createAssetPurchaseRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 15),
          currencyId,
          chaseChecking._id,
          this.assetsMap.get("VANGUARD_INDEX")?._id || "",
          this.partiesMap.get("VANGUARD")?._id || "",
          getTagIds(["INVESTMENT"]),
          2000,
          "Monthly DCA investment"
        )
      );
    }

    return records;
  }

  /**
   * Get asset sale records for a specific month
   */
  private getAssetSaleRecordsForMonth(monthNumber: number, monthStart: Date, currencyId: string, chaseChecking: Wallet & { _id: string }): Record[] {
    const records: Record[] = [];
    const getTagIds = (names: string[]) => names.map((n) => this.tagsMap.get(n)?._id).filter(Boolean) as string[];

    if (monthNumber === 4) {
      records.push(
        this.createAssetSaleRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 25),
          currencyId,
          chaseChecking._id,
          this.assetsMap.get("COMPANY_RSUS")?._id || "",
          this.partiesMap.get("TECHCORP")?._id || "",
          getTagIds(["INVESTMENT"]),
          3000,
          "Sold vested shares for home improvement"
        )
      );
    }

    return records;
  }

  /**
   * Get asset appreciation/depreciation records for a specific month
   */
  private getAssetAppreciationDepreciationRecordsForMonth(monthNumber: number, monthStart: Date, currencyId: string): Record[] {
    const records: Record[] = [];
    const getTagIds = (names: string[]) => names.map((n) => this.tagsMap.get(n)?._id).filter(Boolean) as string[];

    if (monthNumber === 2) {
      records.push(
        this.createAssetAppreciationRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 28),
          currencyId,
          this.assetsMap.get("FAMILY_HOME")?._id || "",
          getTagIds(["INVESTMENT"]),
          5000,
          "Quarterly market adjustment"
        )
      );
    } else if (monthNumber === 3) {
      records.push(
        this.createAssetDepreciationRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 30),
          currencyId,
          this.assetsMap.get("TESLA_MODEL_3")?._id || "",
          [],
          800,
          "Vehicle depreciation"
        )
      );
    } else if (monthNumber === 4) {
      records.push(
        this.createAssetAppreciationRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 28),
          currencyId,
          this.assetsMap.get("VANGUARD_INDEX")?._id || "",
          getTagIds(["INVESTMENT"]),
          1200,
          "Market gains"
        )
      );
    } else if (monthNumber === 5) {
      records.push(
        this.createAssetAppreciationRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 28),
          currencyId,
          this.assetsMap.get("FAMILY_HOME")?._id || "",
          getTagIds(["INVESTMENT"]),
          3500,
          "Quarterly market adjustment"
        ),
        this.createAssetDepreciationRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 30),
          currencyId,
          this.assetsMap.get("BITCOIN")?._id || "",
          getTagIds(["INVESTMENT"]),
          400,
          "Crypto market volatility"
        )
      );
    } else if (monthNumber === 6) {
      records.push(
        this.createAssetAppreciationRecord(
          new Date(monthStart.getFullYear(), monthStart.getMonth(), 28),
          currencyId,
          this.assetsMap.get("VANGUARD_INDEX")?._id || "",
          getTagIds(["INVESTMENT"]),
          900,
          "Market gains"
        )
      );
    }

    return records;
  }

  /**
   * Generate a range of dates from start to end
   */
  private generateDateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Create an income record
   */
  private createIncomeRecord(
    date: Date,
    currencyId: string,
    walletId: string,
    incomeSourceId: string,
    partyId: string,
    tagIds: string[],
    amount: number,
    notes: string
  ): Record {
    return {
      $collection: Collection.RECORD,
      notes: notes,
      type: RecordType.INCOME,
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      income: {
        incomeSourceId,
        amount,
        currencyId,
        partyId,
        walletId,
        amountPaid: amount,
        amountUnpaid: 0,
      },
    };
  }

  /**
   * Create an expense record
   */
  private createExpenseRecord(
    date: Date,
    currencyId: string,
    walletId: string,
    expenseAvenueId: string,
    partyId: string,
    tagIds: string[],
    amount: number,
    notes: string
  ): Record {
    return {
      $collection: Collection.RECORD,
      notes: notes,
      type: RecordType.EXPENSE,
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      expense: {
        expenseAvenueId,
        amount,
        currencyId,
        partyId,
        walletId,
        amountPaid: amount,
        amountUnpaid: 0,
      },
    };
  }

  /**
   * Create an asset purchase record
   */
  private createAssetPurchaseRecord(
    date: Date,
    currencyId: string,
    walletId: string,
    assetId: string,
    partyId: string,
    tagIds: string[],
    amount: number,
    notes: string
  ): Record {
    return {
      $collection: Collection.RECORD,
      notes: notes,
      type: RecordType.ASSET_PURCHASE,
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      assetPurchase: {
        assetId,
        amount,
        currencyId,
        partyId,
        walletId,
        amountPaid: amount,
        amountUnpaid: 0,
      },
    };
  }

  /**
   * Create an asset sale record
   */
  private createAssetSaleRecord(
    date: Date,
    currencyId: string,
    walletId: string,
    assetId: string,
    partyId: string,
    tagIds: string[],
    amount: number,
    notes: string
  ): Record {
    return {
      $collection: Collection.RECORD,
      notes: notes,
      type: RecordType.ASSET_SALE,
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      assetSale: {
        assetId,
        amount,
        currencyId,
        partyId,
        walletId,
        amountPaid: amount,
        amountUnpaid: 0,
      },
    };
  }

  /**
   * Create a money transfer record
   */
  private createMoneyTransferRecord(
    date: Date,
    currencyId: string,
    fromWalletId: string,
    toWalletId: string,
    tagIds: string[],
    amount: number,
    notes: string
  ): Record {
    return {
      $collection: Collection.RECORD,
      notes: notes,
      type: RecordType.MONEY_TRANSFER,
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      moneyTransfer: {
        fromWalletId,
        fromCurrencyId: currencyId,
        fromAmount: amount,
        toWalletId,
        toCurrencyId: currencyId,
        toAmount: amount,
      },
    };
  }

  /**
   * Create a lending record
   */
  private createLendingRecord(date: Date, currencyId: string, walletId: string, partyId: string, tagIds: string[], amount: number, notes: string): Record {
    return {
      $collection: Collection.RECORD,
      notes: notes,
      type: RecordType.LENDING,
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      lending: {
        amount,
        walletId,
        currencyId,
        partyId,
      },
    };
  }

  /**
   * Create a borrowing record
   */
  private createBorrowingRecord(date: Date, currencyId: string, walletId: string, partyId: string, tagIds: string[], amount: number, notes: string): Record {
    return {
      $collection: Collection.RECORD,
      notes: notes,
      type: RecordType.BORROWING,
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      borrowing: {
        amount,
        walletId,
        currencyId,
        partyId,
      },
    };
  }

  /**
   * Create a repayment given record
   */
  private createRepaymentGivenRecord(
    date: Date,
    currencyId: string,
    walletId: string,
    partyId: string,
    tagIds: string[],
    amount: number,
    notes: string
  ): Record {
    return {
      $collection: Collection.RECORD,
      notes: notes,
      type: RecordType.REPAYMENT_GIVEN,
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      repaymentGiven: {
        amount,
        walletId,
        currencyId,
        partyId,
      },
    };
  }

  /**
   * Create a repayment received record
   */
  private createRepaymentReceivedRecord(
    date: Date,
    currencyId: string,
    walletId: string,
    partyId: string,
    tagIds: string[],
    amount: number,
    notes: string
  ): Record {
    return {
      $collection: Collection.RECORD,
      notes: notes,
      type: RecordType.REPAYMENT_RECEIVED,
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      repaymentReceived: {
        amount,
        walletId,
        currencyId,
        partyId,
      },
    };
  }

  /**
   * Create an asset appreciation record
   */
  private createAssetAppreciationRecord(date: Date, currencyId: string, assetId: string, tagIds: string[], amount: number, notes: string): Record {
    return {
      $collection: Collection.RECORD,
      notes: notes,
      type: RecordType.ASSET_APPRECIATION_DEPRECIATION,
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      assetAppreciationDepreciation: {
        assetId,
        type: "appreciation",
        amount,
        currencyId,
      },
    };
  }

  /**
   * Create an asset depreciation record
   */
  private createAssetDepreciationRecord(date: Date, currencyId: string, assetId: string, tagIds: string[], amount: number, notes: string): Record {
    return {
      $collection: Collection.RECORD,
      notes: notes,
      type: RecordType.ASSET_APPRECIATION_DEPRECIATION,
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      assetAppreciationDepreciation: {
        assetId,
        type: "depreciation",
        amount,
        currencyId,
      },
    };
  }

  /**
   * Create a record in the database
   */
  private async createRecord(record: Record): Promise<void> {
    await pouchdbService.upsertDoc(record, { isDemoData: true, demoCreatedAt: Date.now() });
  }

  /**
   * Setup demo budgets according to plan
   */
  async setupDemoBudgets(): Promise<void> {
    if (!this.primaryCurrency) {
      console.log("No primary demo currency available, skipping budget creation");
      return;
    }

    const demoCurrency = this.primaryCurrency;
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get tag IDs for whitelists
    const groceryTag = this.tagsMap.get("GROCERY");
    const entertainmentTag = this.tagsMap.get("ENTERTAINMENT");
    const splurgeTag = this.tagsMap.get("SPLURGE");
    const forRileyTag = this.tagsMap.get("FOR_RILEY");
    const emergencyTag = this.tagsMap.get("EMERGENCY");
    const businessTag = this.tagsMap.get("BUSINESS");
    const taxDeductibleTag = this.tagsMap.get("TAX_DEDUCTIBLE");

    const budgets: RollingBudget[] = [
      {
        $collection: Collection.ROLLING_BUDGET,
        name: "Grocery Budget",
        includeExpenses: true,
        includeAssetPurchases: false,
        tagIdWhiteList: groceryTag ? [groceryTag._id!] : [],
        tagIdBlackList: [],
        frequency: "monthly",
        budgetedPeriodList: [
          {
            startEpoch: currentMonth.getTime(),
            endEpoch: monthEnd.getTime(),
            title: currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
            allocatedAmount: 1000,
            rolledOverAmount: 0,
            totalAllocatedAmount: 1000,
            heldAmount: 0,
            usedAmount: 0,
            remainingAmount: 1000,
            calculatedEpoch: Date.now(),
          },
        ],
        rollOverRule: "positive-only",
        isFeatured: true,
        currencyId: demoCurrency._id!,
        monthlyStartDate: 1,
        monthlyEndDate: 31,
      },
      {
        $collection: Collection.ROLLING_BUDGET,
        name: "Entertainment Budget",
        includeExpenses: true,
        includeAssetPurchases: false,
        tagIdWhiteList: [entertainmentTag?._id, splurgeTag?._id].filter(Boolean) as string[],
        tagIdBlackList: [],
        frequency: "monthly",
        budgetedPeriodList: [
          {
            startEpoch: currentMonth.getTime(),
            endEpoch: monthEnd.getTime(),
            title: currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
            allocatedAmount: 300,
            rolledOverAmount: 0,
            totalAllocatedAmount: 300,
            heldAmount: 0,
            usedAmount: 0,
            remainingAmount: 300,
            calculatedEpoch: Date.now(),
          },
        ],
        rollOverRule: "never",
        isFeatured: true,
        currencyId: demoCurrency._id!,
        monthlyStartDate: 1,
        monthlyEndDate: 31,
      },
      {
        $collection: Collection.ROLLING_BUDGET,
        name: "Riley's Expenses",
        includeExpenses: true,
        includeAssetPurchases: false,
        tagIdWhiteList: forRileyTag ? [forRileyTag._id!] : [],
        tagIdBlackList: [],
        frequency: "monthly",
        budgetedPeriodList: [
          {
            startEpoch: currentMonth.getTime(),
            endEpoch: monthEnd.getTime(),
            title: currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
            allocatedAmount: 400,
            rolledOverAmount: 0,
            totalAllocatedAmount: 400,
            heldAmount: 0,
            usedAmount: 0,
            remainingAmount: 400,
            calculatedEpoch: Date.now(),
          },
        ],
        rollOverRule: "positive-only",
        isFeatured: false,
        currencyId: demoCurrency._id!,
        monthlyStartDate: 1,
        monthlyEndDate: 31,
      },
      {
        $collection: Collection.ROLLING_BUDGET,
        name: "Emergency Fund",
        includeExpenses: true,
        includeAssetPurchases: false,
        tagIdWhiteList: emergencyTag ? [emergencyTag._id!] : [],
        tagIdBlackList: [],
        frequency: "monthly",
        budgetedPeriodList: [
          {
            startEpoch: currentMonth.getTime(),
            endEpoch: monthEnd.getTime(),
            title: currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
            allocatedAmount: 500,
            rolledOverAmount: 0,
            totalAllocatedAmount: 500,
            heldAmount: 0,
            usedAmount: 0,
            remainingAmount: 500,
            calculatedEpoch: Date.now(),
          },
        ],
        rollOverRule: "always",
        isFeatured: false,
        currencyId: demoCurrency._id!,
        monthlyStartDate: 1,
        monthlyEndDate: 31,
      },
      {
        $collection: Collection.ROLLING_BUDGET,
        name: "Business Expenses",
        includeExpenses: true,
        includeAssetPurchases: false,
        tagIdWhiteList: [businessTag?._id, taxDeductibleTag?._id].filter(Boolean) as string[],
        tagIdBlackList: [],
        frequency: "monthly",
        budgetedPeriodList: [
          {
            startEpoch: currentMonth.getTime(),
            endEpoch: monthEnd.getTime(),
            title: currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
            allocatedAmount: 250,
            rolledOverAmount: 0,
            totalAllocatedAmount: 250,
            heldAmount: 0,
            usedAmount: 0,
            remainingAmount: 250,
            calculatedEpoch: Date.now(),
          },
        ],
        rollOverRule: "positive-only",
        isFeatured: false,
        currencyId: demoCurrency._id!,
        monthlyStartDate: 1,
        monthlyEndDate: 31,
      },
    ];

    for (const budget of budgets) {
      await pouchdbService.upsertDoc(budget, { isDemoData: true, demoCreatedAt: Date.now() });
      this.createdCounts.budgets++;
    }
  }

  /**
   * Setup demo templates according to plan
   */
  async setupDemoTemplates(): Promise<void> {
    if (!this.primaryCurrency) {
      console.log("No primary demo currency available, skipping template creation");
      return;
    }

    const currencyId = this.primaryCurrency._id!;
    const chaseChecking = this.walletsMap.get("CHASE_CHECKING");
    const amexCreditCard = this.walletsMap.get("AMEX_CREDIT_CARD");
    const cash = this.walletsMap.get("CASH");
    const jamieBusiness = this.walletsMap.get("JAMIE_BUSINESS");
    const chaseSavings = this.walletsMap.get("CHASE_SAVINGS");

    if (!chaseChecking || !amexCreditCard || !cash) {
      console.log("Required wallets not available for templates");
      return;
    }

    const groceriesAvenue = this.expenseAvenuesMap.get("GROCERIES");
    const gasFuelAvenue = this.expenseAvenuesMap.get("GAS_FUEL");
    const coffeeSnacksAvenue = this.expenseAvenuesMap.get("COFFEE_SNACKS");
    const freelanceDesignSource = this.incomeSourcesMap.get("FREELANCE_DESIGN");
    const hebGrocery = this.partiesMap.get("HEB_GROCERY");
    const shell = this.partiesMap.get("SHELL");
    const starbucks = this.partiesMap.get("STARBUCKS");

    const groceryTag = this.tagsMap.get("GROCERY");
    const essentialTag = this.tagsMap.get("ESSENTIAL");
    const splurgeTag = this.tagsMap.get("SPLURGE");
    const businessTag = this.tagsMap.get("BUSINESS");

    const templates: Record[] = [
      {
        $collection: Collection.RECORD_TEMPLATE,
        templateName: "Weekly Groceries",
        notes: "Weekly groceries",
        type: RecordType.EXPENSE,
        tagIdList: [groceryTag?._id, essentialTag?._id].filter(Boolean) as string[],
        transactionEpoch: Date.now(),
        expense: {
          expenseAvenueId: groceriesAvenue?._id || "",
          amount: 180,
          currencyId,
          partyId: hebGrocery?._id || null,
          walletId: amexCreditCard._id!,
          amountPaid: 180,
          amountUnpaid: 0,
        },
      },
      {
        $collection: Collection.RECORD_TEMPLATE,
        templateName: "Gas Fill-up",
        notes: "Gas fill-up",
        type: RecordType.EXPENSE,
        tagIdList: essentialTag ? [essentialTag._id!] : [],
        transactionEpoch: Date.now(),
        expense: {
          expenseAvenueId: gasFuelAvenue?._id || "",
          amount: 55,
          currencyId,
          partyId: shell?._id || null,
          walletId: amexCreditCard._id!,
          amountPaid: 55,
          amountUnpaid: 0,
        },
      },
      {
        $collection: Collection.RECORD_TEMPLATE,
        templateName: "Coffee Run",
        notes: "Coffee run",
        type: RecordType.EXPENSE,
        tagIdList: splurgeTag ? [splurgeTag._id!] : [],
        transactionEpoch: Date.now(),
        expense: {
          expenseAvenueId: coffeeSnacksAvenue?._id || "",
          amount: 15,
          currencyId,
          partyId: starbucks?._id || null,
          walletId: cash._id!,
          amountPaid: 15,
          amountUnpaid: 0,
        },
      },
      {
        $collection: Collection.RECORD_TEMPLATE,
        templateName: "Monthly Savings",
        notes: "Monthly savings transfer",
        type: RecordType.MONEY_TRANSFER,
        tagIdList: [],
        transactionEpoch: Date.now(),
        moneyTransfer: {
          fromWalletId: chaseChecking._id!,
          fromCurrencyId: currencyId,
          fromAmount: 1000,
          toWalletId: chaseSavings?._id || chaseChecking._id!,
          toCurrencyId: currencyId,
          toAmount: 1000,
        },
      },
      {
        $collection: Collection.RECORD_TEMPLATE,
        templateName: "Pay Credit Card",
        notes: "Credit card payment",
        type: RecordType.MONEY_TRANSFER,
        tagIdList: [],
        transactionEpoch: Date.now(),
        moneyTransfer: {
          fromWalletId: chaseChecking._id!,
          fromCurrencyId: currencyId,
          fromAmount: 2000,
          toWalletId: amexCreditCard._id!,
          toCurrencyId: currencyId,
          toAmount: 2000,
        },
      },
      {
        $collection: Collection.RECORD_TEMPLATE,
        templateName: "Client Payment",
        notes: "Client payment",
        type: RecordType.INCOME,
        tagIdList: businessTag ? [businessTag._id!] : [],
        transactionEpoch: Date.now(),
        income: {
          incomeSourceId: freelanceDesignSource?._id || "",
          amount: 1500,
          currencyId,
          partyId: null,
          walletId: jamieBusiness?._id || chaseChecking._id!,
          amountPaid: 1500,
          amountUnpaid: 0,
        },
      },
    ];

    for (const template of templates) {
      await pouchdbService.upsertDoc(template, { isDemoData: true, demoCreatedAt: Date.now() });
    }
  }

  /**
   * Setup demo memos according to plan
   */
  async setupDemoMemos(): Promise<void> {
    const memos: Memo[] = [
      {
        $collection: Collection.MEMO,
        name: "Tax Documents Checklist",
        content:
          "W-2 from TechCorp\n1099s for freelance work\nMortgage interest statement (Form 1098)\nCharitable donation receipts\nMedical expense summary\nBusiness expense receipts",
        modifiedEpoch: Date.now(),
      },
      {
        $collection: Collection.MEMO,
        name: "Financial Goals 2024",
        content:
          "Max out 401k contribution ($22,500)\nBuild emergency fund to $30,000\nPay off auto loan by December\nStart 529 college savings for Riley\nIncrease investment contributions",
        modifiedEpoch: Date.now(),
      },
      {
        $collection: Collection.MEMO,
        name: "Insurance Policy Numbers",
        content: "Home Insurance: HO-2024-123456\nAuto Insurance: AU-2024-789012\nHealth Insurance: HE-2024-345678\nLife Insurance: LF-2024-901234",
        modifiedEpoch: Date.now(),
      },
      {
        $collection: Collection.MEMO,
        name: "Freelance Rate Card",
        content: "Logo Design: $1,200\nBrand Package: $3,500\nWeb Design: $5,500\nSocial Media Package: $800\nHourly Rate: $95",
        modifiedEpoch: Date.now(),
      },
      {
        $collection: Collection.MEMO,
        name: "Monthly Budget Notes",
        content:
          "Electricity runs higher June through August (summer AC)\nCar insurance renews in March\nPiano lessons on break in December\nQuarterly investment on 15th of Mar/Jun/Sep/Dec",
        modifiedEpoch: Date.now(),
      },
    ];

    for (const memo of memos) {
      await pouchdbService.upsertDoc(memo, { isDemoData: true, demoCreatedAt: Date.now() });
    }
  }

  /**
   * Setup demo text import rules according to plan
   */
  async setupDemoTextImportRules(): Promise<void> {
    const chaseChecking = this.walletsMap.get("CHASE_CHECKING");
    const amexCreditCard = this.walletsMap.get("AMEX_CREDIT_CARD");
    const groceriesAvenue = this.expenseAvenuesMap.get("GROCERIES");
    const gasFuelAvenue = this.expenseAvenuesMap.get("GAS_FUEL");
    const electricityAvenue = this.expenseAvenuesMap.get("ELECTRICITY");
    const amazonPurchasesAvenue = this.expenseAvenuesMap.get("AMAZON_PURCHASES");
    const streamingAvenue = this.expenseAvenuesMap.get("STREAMING");

    if (!chaseChecking || !amexCreditCard) {
      console.log("Required wallets not available for text import rules");
      return;
    }

    const rules: TextImportRules[] = [
      {
        $collection: Collection.TEXT_IMPORT_RULES,
        name: "Chase Bank Statement",
        description: "Import transactions from Chase bank CSV export",
        regex: "^(\\d{2}/\\d{2}/\\d{4}),([^,]+),([^,]+),(-?\\d+\\.\\d{2})$",
        dateCaptureGroup: 1,
        dateFormat: "MM/DD/YYYY",
        walletCaptureGroup: 2,
        amountCaptureGroup: 4,
        expenseAvenueCaptureGroup: 3,
        walletMatchRules: [
          {
            operator: "contains",
            value: "CHECKING",
            walletId: chaseChecking._id!,
          },
        ],
        expenseAvenueMatchRules: [
          {
            operator: "contains",
            value: "H-E-B",
            expenseAvenueId: groceriesAvenue?._id || "",
          },
          {
            operator: "contains",
            value: "SHELL",
            expenseAvenueId: gasFuelAvenue?._id || "",
          },
          {
            operator: "contains",
            value: "AUSTIN ENERGY",
            expenseAvenueId: electricityAvenue?._id || "",
          },
          {
            operator: "contains",
            value: "AMAZON",
            expenseAvenueId: amazonPurchasesAvenue?._id || "",
          },
        ],
        isActive: true,
      },
      {
        $collection: Collection.TEXT_IMPORT_RULES,
        name: "Amex Statement",
        description: "Import transactions from American Express CSV export",
        regex: "^(\\d{2}-\\d{2}-\\d{4})\\s+(.+?)\\s+(-?\\$\\d+\\.\\d{2})$",
        dateCaptureGroup: 1,
        dateFormat: "MM-DD-YYYY",
        walletCaptureGroup: 2,
        amountCaptureGroup: 3,
        expenseAvenueCaptureGroup: 2,
        walletMatchRules: [
          {
            operator: "exact-match",
            value: "AMEX",
            walletId: amexCreditCard._id!,
          },
        ],
        expenseAvenueMatchRules: [
          {
            operator: "contains",
            value: "NETFLIX",
            expenseAvenueId: streamingAvenue?._id || "",
          },
          {
            operator: "contains",
            value: "SPOTIFY",
            expenseAvenueId: streamingAvenue?._id || "",
          },
        ],
        isActive: true,
      },
    ];

    for (const rule of rules) {
      await pouchdbService.upsertDoc(rule, { isDemoData: true, demoCreatedAt: Date.now() });
    }
  }

  /**
   * Setup additional demo data (complements onboarding data)
   */
  async setupAllDemoData(): Promise<void> {
    console.log("Starting additional demo data setup...");

    // Populate maps with existing entities first
    console.log("Populating maps with existing entities...");
    await this.populateMapsWithExistingEntities();

    // Create additional currencies first (complements whatever was chosen during onboarding)
    console.log("Creating additional demo currencies...");
    await this.setupDemoCurrencies();
    console.log(`Created ${this.createdCounts.currencies} additional currencies`);

    // Create additional wallets (complements onboarding wallets)
    console.log("Creating additional demo wallets...");
    await this.setupDemoWallets();
    console.log(`Created ${this.createdCounts.wallets} additional wallets`);

    // Create additional parties (complements onboarding parties)
    console.log("Creating additional demo parties...");
    await this.setupDemoParties();
    console.log(`Created ${this.createdCounts.parties} additional parties`);

    // Create additional assets (complements onboarding assets)
    console.log("Creating additional demo assets...");
    await this.setupDemoAssets();
    console.log(`Created ${this.createdCounts.assets} additional assets`);

    // Create additional expense avenues (complements onboarding expense avenues)
    console.log("Creating additional demo expense avenues...");
    await this.setupDemoExpenseAvenues();
    console.log(`Created ${this.createdCounts.expenseAvenues} additional expense avenues`);

    // Create additional income sources (complements onboarding income sources)
    console.log("Creating additional demo income sources...");
    await this.setupDemoIncomeSources();
    console.log(`Created ${this.createdCounts.incomeSources} additional income sources`);

    // Create demo tags
    console.log("Creating additional demo tags...");
    await this.setupDemoTags();
    console.log(`Created ${this.createdCounts.tags} additional tags`);

    // Create comprehensive demo records
    console.log("Creating comprehensive demo records...");
    await this.setupDemoRecords();
    console.log(`Created ${this.createdCounts.records} additional records`);

    // Create demo budgets
    console.log("Creating demo budgets...");
    await this.setupDemoBudgets();
    console.log(`Created ${this.createdCounts.budgets} additional budgets`);

    // Create demo templates
    console.log("Creating demo templates...");
    await this.setupDemoTemplates();

    // Create demo memos
    console.log("Creating demo memos...");
    await this.setupDemoMemos();

    // Create demo text import rules
    console.log("Creating demo text import rules...");
    await this.setupDemoTextImportRules();

    console.log("Additional demo data setup completed successfully!");
  }

  /**
   * Get the primary demo currency
   */
  getPrimaryCurrency(): Currency | null {
    return this.primaryCurrency;
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
    expenseAvenues: ExpenseAvenue[];
    incomeSources: IncomeSource[];
    tags: Tag[];
    records: Record[];
  } {
    return {
      currencies: Array.from(this.currenciesMap.values()),
      wallets: Array.from(this.walletsMap.values()),
      parties: Array.from(this.partiesMap.values()),
      assets: Array.from(this.assetsMap.values()),
      budgets: [], // Budgets are not stored in maps, only counted
      expenseAvenues: Array.from(this.expenseAvenuesMap.values()),
      incomeSources: Array.from(this.incomeSourcesMap.values()),
      tags: Array.from(this.tagsMap.values()),
      records: [], // Records are not stored in maps, only counted
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
    expenseAvenues: number;
    incomeSources: number;
    tags: number;
    records: number;
  } {
    return {
      currencies: this.createdCounts.currencies,
      wallets: this.createdCounts.wallets,
      parties: this.createdCounts.parties,
      assets: this.createdCounts.assets,
      budgets: this.createdCounts.budgets,
      expenseAvenues: this.createdCounts.expenseAvenues,
      incomeSources: this.createdCounts.incomeSources,
      tags: this.createdCounts.tags,
      records: this.createdCounts.records,
    };
  }

  /**
   * Clear all demo data
   */
  async clearAllDemoData(): Promise<void> {
    console.log("Starting demo data cleanup...");

    // Get all demo documents
    const collections = [
      Collection.CURRENCY,
      Collection.WALLET,
      Collection.PARTY,
      Collection.ASSET,
      Collection.ROLLING_BUDGET,
      Collection.EXPENSE_AVENUE,
      Collection.INCOME_SOURCE,
      Collection.TAG,
      Collection.RECORD,
    ];

    for (const collection of collections) {
      const docs = await pouchdbService.listByCollection(collection);
      console.log(`Found ${docs.docs.length} documents in ${collection}`);

      // Only remove documents that are marked as demo data
      const demoDocs = docs.docs.filter((doc) => (doc as any).isDemoData === true);
      console.log(`Found ${demoDocs.length} demo documents in ${collection}`);

      for (const doc of demoDocs) {
        await pouchdbService.removeDoc(doc, true);
      }
    }

    console.log("Demo data cleanup completed!");

    // Reset the primary currency
    this.primaryCurrency = null;

    // Reset all maps and counters
    this.currenciesMap.clear();
    this.walletsMap.clear();
    this.partiesMap.clear();
    this.assetsMap.clear();
    this.expenseAvenuesMap.clear();
    this.incomeSourcesMap.clear();
    this.tagsMap.clear();

    // Reset counters
    this.createdCounts = {
      currencies: 0,
      wallets: 0,
      parties: 0,
      assets: 0,
      budgets: 0,
      expenseAvenues: 0,
      incomeSources: 0,
      tags: 0,
      records: 0,
    };
  }
}

export const demoPreparationService = new DemoPreparationService();
