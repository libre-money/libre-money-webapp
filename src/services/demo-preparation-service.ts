import { Collection } from "src/constants/constants";
import { Asset } from "src/models/asset";
import { Currency } from "src/models/currency";
import { Party } from "src/models/party";
import { Wallet } from "src/models/wallet";
import { RollingBudget } from "src/models/rolling-budget";
import { Record } from "src/models/record";
import { ExpenseAvenue } from "src/models/expense-avenue";
import { IncomeSource } from "src/models/income-source";
import { Tag } from "src/models/tag";
import { RecordType } from "src/constants/constants";
import { pouchdbService } from "./pouchdb-service";

class DemoPreparationService {
  // Class variables to store created entities
  private createdCurrencies: Currency[] = [];
  private createdWallets: Wallet[] = [];
  private createdParties: Party[] = [];
  private createdAssets: Asset[] = [];
  private createdBudgets: RollingBudget[] = [];
  private createdExpenseAvenues: ExpenseAvenue[] = [];
  private createdIncomeSources: IncomeSource[] = [];
  private createdTags: Tag[] = [];
  private createdRecords: Record[] = [];

  // State variable to store the primary demo currency
  private primaryCurrency: Currency | null = null;

  /**
   * Setup additional demo currencies (complements whatever currency was chosen during onboarding)
   */
  async setupDemoCurrencies(): Promise<void> {
    // Get existing currencies to see what's already available
    const existingCurrencies = await pouchdbService.listByCollection(Collection.CURRENCY);

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
      (demoCurrency) => !existingCurrencies.docs.some((existing: any) => existing.name === demoCurrency.name || existing.sign === demoCurrency.sign)
    );

    if (currenciesToCreate.length === 0) {
      console.log("USD and Euro already exist, skipping creation");
      return;
    }

    console.log(`Creating ${currenciesToCreate.length} additional demo currencies: ${currenciesToCreate.map((c) => c.name).join(", ")}`);

    this.createdCurrencies = [];
    for (const currency of currenciesToCreate) {
      const result = await pouchdbService.upsertDoc(currency, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdCurrency = { ...currency, _id: result.id, _rev: result.rev };
      this.createdCurrencies.push(createdCurrency);

      // Set the first created currency as the primary demo currency
      if (!this.primaryCurrency) {
        this.primaryCurrency = createdCurrency;
      }
    }
  }

  /**
   * Setup additional demo wallets (complements onboarding wallets)
   */
  async setupDemoWallets(): Promise<void> {
    // Get existing wallets to avoid duplicates
    const existingWallets = await pouchdbService.listByCollection(Collection.WALLET);

    if (!this.primaryCurrency) {
      console.log("No primary demo currency available, skipping wallet creation");
      return;
    }

    // Use the primary demo currency for wallets
    const demoCurrency = this.primaryCurrency;
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
      {
        $collection: Collection.PARTY,
        name: "TechStart Inc.",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "HealthFirst Insurance",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "City Transit Authority",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "Precious Metals Exchange",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "Sarah Johnson",
        type: "party",
      },
      {
        $collection: Collection.PARTY,
        name: "Mike Chen",
        type: "party",
      },
      {
        $collection: Collection.PARTY,
        name: "Global Investment Group",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "Family Trust Fund",
        type: "party",
      },
      {
        $collection: Collection.PARTY,
        name: "Fashion Forward Boutique",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "FitLife Gym & Wellness Center",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "City Utilities Company",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "Home Depot",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "Starbucks Coffee",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "Amazon Prime",
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

    if (!this.primaryCurrency) {
      console.log("No primary demo currency available, skipping asset creation");
      return;
    }

    // Use the primary demo currency for assets
    const demoCurrency = this.primaryCurrency;
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
   * Setup additional demo expense avenues (complements onboarding expense avenues)
   */
  async setupDemoExpenseAvenues(): Promise<void> {
    // Get existing expense avenues to avoid duplicates
    const existingExpenseAvenues = await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE);

    // Create additional expense avenues that complement onboarding expense avenues
    const expenseAvenues: ExpenseAvenue[] = [
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Entertainment",
      },
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Healthcare",
      },
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Education",
      },
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Insurance",
      },
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Utilities",
      },
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Transportation",
      },
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Shopping",
      },
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Investment Fees",
      },
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Home & Garden",
      },
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Technology",
      },
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Fitness & Wellness",
      },
      {
        $collection: Collection.EXPENSE_AVENUE,
        name: "Charity & Donations",
      },
    ];

    this.createdExpenseAvenues = [];
    for (const avenue of expenseAvenues) {
      const result = await pouchdbService.upsertDoc(avenue, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdAvenue = { ...avenue, _id: result.id, _rev: result.rev };
      this.createdExpenseAvenues.push(createdAvenue);
    }
  }

  /**
   * Setup additional demo income sources (complements onboarding income sources)
   */
  async setupDemoIncomeSources(): Promise<void> {
    // Get existing income sources to avoid duplicates
    const existingIncomeSources = await pouchdbService.listByCollection(Collection.INCOME_SOURCE);

    // Create additional income sources that complement onboarding income sources
    const incomeSources: IncomeSource[] = [
      {
        $collection: Collection.INCOME_SOURCE,
        name: "Rental Income",
      },
      {
        $collection: Collection.INCOME_SOURCE,
        name: "Consulting",
      },
      {
        $collection: Collection.INCOME_SOURCE,
        name: "Online Sales",
      },
      {
        $collection: Collection.INCOME_SOURCE,
        name: "Interest Income",
      },
      {
        $collection: Collection.INCOME_SOURCE,
        name: "Royalties",
      },
      {
        $collection: Collection.INCOME_SOURCE,
        name: "Dividend Income",
      },
      {
        $collection: Collection.INCOME_SOURCE,
        name: "Capital Gains",
      },
      {
        $collection: Collection.INCOME_SOURCE,
        name: "Part-time Work",
      },
      {
        $collection: Collection.INCOME_SOURCE,
        name: "Online Courses",
      },
      {
        $collection: Collection.INCOME_SOURCE,
        name: "Affiliate Marketing",
      },
    ];

    this.createdIncomeSources = [];
    for (const source of incomeSources) {
      const result = await pouchdbService.upsertDoc(source, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdSource = { ...source, _id: result.id, _rev: result.rev };
      this.createdIncomeSources.push(createdSource);
    }
  }

  /**
   * Setup demo tags for categorizing records
   */
  async setupDemoTags(): Promise<void> {
    // Create demo tags with different colors
    const tags: Tag[] = [
      {
        $collection: Collection.TAG,
        name: "Essential",
        color: "#FF6B6B",
      },
      {
        $collection: Collection.TAG,
        name: "Luxury",
        color: "#4ECDC4",
      },
      {
        $collection: Collection.TAG,
        name: "Investment",
        color: "#45B7D1",
      },
      {
        $collection: Collection.TAG,
        name: "Emergency",
        color: "#96CEB4",
      },
      {
        $collection: Collection.TAG,
        name: "Recurring",
        color: "#FFEAA7",
      },
      {
        $collection: Collection.TAG,
        name: "One-time",
        color: "#DDA0DD",
      },
      {
        $collection: Collection.TAG,
        name: "Business",
        color: "#F8B500",
      },
      {
        $collection: Collection.TAG,
        name: "Personal",
        color: "#E17055",
      },
      {
        $collection: Collection.TAG,
        name: "Tax Deductible",
        color: "#2ECC71",
      },
      {
        $collection: Collection.TAG,
        name: "High Priority",
        color: "#E74C3C",
      },
      {
        $collection: Collection.TAG,
        name: "Low Priority",
        color: "#95A5A6",
      },
      {
        $collection: Collection.TAG,
        name: "Seasonal",
        color: "#3498DB",
      },
      {
        $collection: Collection.TAG,
        name: "Travel",
        color: "#9B59B6",
      },
      {
        $collection: Collection.TAG,
        name: "Home",
        color: "#E67E22",
      },
      {
        $collection: Collection.TAG,
        name: "Health",
        color: "#1ABC9C",
      },
    ];

    this.createdTags = [];
    for (const tag of tags) {
      const result = await pouchdbService.upsertDoc(tag, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdTag = { ...tag, _id: result.id, _rev: result.rev };
      this.createdTags.push(createdTag);
    }
  }

  /**
   * Setup comprehensive demo records for all record types
   */
  async setupDemoRecords(): Promise<void> {
    if (!this.primaryCurrency || this.createdWallets.length === 0 || this.createdParties.length === 0 || this.createdAssets.length === 0) {
      console.log("Required demo entities not available, skipping record creation");
      return;
    }

    // Get all available entities for creating records
    const allCurrencies = await pouchdbService.listByCollection(Collection.CURRENCY);
    const allWallets = await pouchdbService.listByCollection(Collection.WALLET);
    const allParties = await pouchdbService.listByCollection(Collection.PARTY);
    const allAssets = await pouchdbService.listByCollection(Collection.ASSET);
    const allExpenseAvenues = await pouchdbService.listByCollection(Collection.EXPENSE_AVENUE);
    const allIncomeSources = await pouchdbService.listByCollection(Collection.INCOME_SOURCE);
    const allTags = await pouchdbService.listByCollection(Collection.TAG);

    // Create Maps with meaningful keys for easy access
    const currenciesMap = new Map<string, any>();
    const walletsMap = new Map<string, any>();
    const partiesMap = new Map<string, any>();
    const assetsMap = new Map<string, any>();
    const expenseAvenuesMap = new Map<string, any>();
    const incomeSourcesMap = new Map<string, any>();
    const tagsMap = new Map<string, any>();

    // Populate Maps with meaningful keys
    allCurrencies.docs.forEach((currency: any) => {
      if (currency.name === "US Dollar") currenciesMap.set("USD", currency);
      else if (currency.name === "Euro") currenciesMap.set("EUR", currency);
      else currenciesMap.set("PRIMARY", currency); // Default/onboarding currency
    });

    allWallets.docs.forEach((wallet: any) => {
      if (wallet.name === "Cash") walletsMap.set("CASH", wallet);
      else if (wallet.name === "Checking Account") walletsMap.set("CHECKING", wallet);
      else if (wallet.name === "Savings Account") walletsMap.set("SAVINGS", wallet);
      else if (wallet.name === "Credit Card") walletsMap.set("CREDIT_CARD", wallet);
      else if (wallet.name === "Investment Account") walletsMap.set("INVESTMENT", wallet);
      else if (wallet.name === "Travel Fund") walletsMap.set("TRAVEL", wallet);
      else walletsMap.set("PRIMARY", wallet);
    });

    allParties.docs.forEach((party: any) => {
      if (party.name === "Employer") partiesMap.set("EMPLOYER", party);
      else if (party.name === "John Doe") partiesMap.set("JOHN_DOE", party);
      else if (party.name === "Jane Smith") partiesMap.set("JANE_SMITH", party);
      else if (party.name === "Grocery Store") partiesMap.set("GROCERY_STORE", party);
      else if (party.name === "Restaurant") partiesMap.set("RESTAURANT", party);
      else if (party.name === "Investment Broker") partiesMap.set("INVESTMENT_BROKER", party);
      else if (party.name === "HealthFirst Insurance") partiesMap.set("HEALTH_INSURANCE", party);
      else if (party.name === "City Transit Authority") partiesMap.set("TRANSIT_AUTHORITY", party);
      else if (party.name === "TechStart Inc.") partiesMap.set("TECH_STARTUP", party);
      else if (party.name === "Precious Metals Exchange") partiesMap.set("METALS_EXCHANGE", party);
      else if (party.name === "Home Depot") partiesMap.set("HOME_DEPOT", party);
      else if (party.name === "Fashion Forward Boutique") partiesMap.set("FASHION_BOUTIQUE", party);
      else if (party.name === "FitLife Gym & Wellness Center") partiesMap.set("GYM", party);
      else if (party.name === "City Utilities Company") partiesMap.set("UTILITIES_COMPANY", party);
      else if (party.name === "Starbucks Coffee") partiesMap.set("STARBUCKS", party);
      else if (party.name === "Amazon Prime") partiesMap.set("AMAZON", party);
      else if (party.name === "Sarah Johnson") partiesMap.set("SARAH_JOHNSON", party);
      else if (party.name === "Mike Chen") partiesMap.set("MIKE_CHEN", party);
      else if (party.name === "Global Investment Group") partiesMap.set("GLOBAL_INVESTMENT", party);
      else if (party.name === "Family Trust Fund") partiesMap.set("FAMILY_TRUST", party);
      else partiesMap.set("DEFAULT", party);
    });

    allAssets.docs.forEach((asset: any) => {
      if (asset.name === "Stock Portfolio") assetsMap.set("STOCK_PORTFOLIO", asset);
      else if (asset.name === "Gold Investment") assetsMap.set("GOLD_INVESTMENT", asset);
      else if (asset.name === "Fixed Deposit") assetsMap.set("FIXED_DEPOSIT", asset);
      else if (asset.name === "Mutual Fund") assetsMap.set("MUTUAL_FUND", asset);
      else if (asset.name === "Emergency Fund") assetsMap.set("EMERGENCY_FUND", asset);
      else if (asset.name === "Retirement Fund") assetsMap.set("RETIREMENT_FUND", asset);
      else if (asset.name === "House") assetsMap.set("HOUSE", asset);
      else if (asset.name === "Car") assetsMap.set("CAR", asset);
      else assetsMap.set("DEFAULT", asset);
    });

    allExpenseAvenues.docs.forEach((avenue: any) => {
      if (avenue.name === "Grocery") expenseAvenuesMap.set("GROCERY", avenue);
      else if (avenue.name === "Travel") expenseAvenuesMap.set("TRAVEL", avenue);
      else if (avenue.name === "Entertainment") expenseAvenuesMap.set("ENTERTAINMENT", avenue);
      else if (avenue.name === "Healthcare") expenseAvenuesMap.set("HEALTHCARE", avenue);
      else if (avenue.name === "Education") expenseAvenuesMap.set("EDUCATION", avenue);
      else if (avenue.name === "Insurance") expenseAvenuesMap.set("INSURANCE", avenue);
      else if (avenue.name === "Utilities") expenseAvenuesMap.set("UTILITIES", avenue);
      else if (avenue.name === "Transportation") expenseAvenuesMap.set("TRANSPORTATION", avenue);
      else if (avenue.name === "Shopping") expenseAvenuesMap.set("SHOPPING", avenue);
      else if (avenue.name === "Investment Fees") expenseAvenuesMap.set("INVESTMENT_FEES", avenue);
      else if (avenue.name === "Home & Garden") expenseAvenuesMap.set("HOME_GARDEN", avenue);
      else if (avenue.name === "Technology") expenseAvenuesMap.set("TECHNOLOGY", avenue);
      else if (avenue.name === "Fitness & Wellness") expenseAvenuesMap.set("FITNESS_WELLNESS", avenue);
      else if (avenue.name === "Charity & Donations") expenseAvenuesMap.set("CHARITY_DONATIONS", avenue);
      else expenseAvenuesMap.set("DEFAULT", avenue);
    });

    allIncomeSources.docs.forEach((source: any) => {
      if (source.name === "Salary") incomeSourcesMap.set("SALARY", source);
      else if (source.name === "Freelance") incomeSourcesMap.set("FREELANCE", source);
      else if (source.name === "Business") incomeSourcesMap.set("BUSINESS", source);
      else if (source.name === "Investments") incomeSourcesMap.set("INVESTMENTS", source);
      else if (source.name === "Rental Income") incomeSourcesMap.set("RENTAL_INCOME", source);
      else if (source.name === "Consulting") incomeSourcesMap.set("CONSULTING", source);
      else if (source.name === "Online Sales") incomeSourcesMap.set("ONLINE_SALES", source);
      else if (source.name === "Interest Income") incomeSourcesMap.set("INTEREST_INCOME", source);
      else if (source.name === "Royalties") incomeSourcesMap.set("ROYALTIES", source);
      else if (source.name === "Dividend Income") incomeSourcesMap.set("DIVIDEND_INCOME", source);
      else if (source.name === "Capital Gains") incomeSourcesMap.set("CAPITAL_GAINS", source);
      else if (source.name === "Part-time Work") incomeSourcesMap.set("PART_TIME_WORK", source);
      else if (source.name === "Online Courses") incomeSourcesMap.set("ONLINE_COURSES", source);
      else if (source.name === "Affiliate Marketing") incomeSourcesMap.set("AFFILIATE_MARKETING", source);
      else incomeSourcesMap.set("DEFAULT", source);
    });

    allTags.docs.forEach((tag: any) => {
      if (tag.name === "Essential") tagsMap.set("ESSENTIAL", tag);
      else if (tag.name === "Luxury") tagsMap.set("LUXURY", tag);
      else if (tag.name === "Investment") tagsMap.set("INVESTMENT", tag);
      else if (tag.name === "Emergency") tagsMap.set("EMERGENCY", tag);
      else if (tag.name === "Recurring") tagsMap.set("RECURRING", tag);
      else if (tag.name === "One-time") tagsMap.set("ONE_TIME", tag);
      else if (tag.name === "Business") tagsMap.set("BUSINESS", tag);
      else if (tag.name === "Personal") tagsMap.set("PERSONAL", tag);
      else if (tag.name === "Tax Deductible") tagsMap.set("TAX_DEDUCTIBLE", tag);
      else if (tag.name === "High Priority") tagsMap.set("HIGH_PRIORITY", tag);
      else if (tag.name === "Low Priority") tagsMap.set("LOW_PRIORITY", tag);
      else if (tag.name === "Seasonal") tagsMap.set("SEASONAL", tag);
      else if (tag.name === "Travel") tagsMap.set("TRAVEL", tag);
      else if (tag.name === "Home") tagsMap.set("HOME", tag);
      else if (tag.name === "Health") tagsMap.set("HEALTH", tag);
      else tagsMap.set("DEFAULT", tag);
    });

    // Get primary entities with fallbacks
    const primaryCurrency = currenciesMap.get("PRIMARY") || currenciesMap.get("USD") || allCurrencies.docs[0];
    const primaryWallet = walletsMap.get("CHECKING") || walletsMap.get("PRIMARY") || allWallets.docs[0];
    const secondaryWallet = walletsMap.get("SAVINGS") || walletsMap.get("PRIMARY") || allWallets.docs[0];
    const investmentWallet = walletsMap.get("INVESTMENT") || walletsMap.get("SAVINGS") || allWallets.docs[0];

    // Calculate date range: from start of last month to current date
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Generate dates for records
    const dates = this.generateDateRange(lastMonth, now);

    console.log(`Creating demo records for ${dates.length} dates from ${lastMonth.toLocaleDateString()} to ${now.toLocaleDateString()}`);

    this.createdRecords = [];
    let recordCount = 0;

    // Create records for each date
    for (const date of dates) {
      const dayOfMonth = date.getDate();
      const isStartOfMonth = dayOfMonth <= 3;
      const isMiddleOfMonth = dayOfMonth > 10 && dayOfMonth < 25;
      const isEndOfMonth = dayOfMonth > 25;

      // Income records (at start of month)
      if (isStartOfMonth) {
        const incomeRecord = this.createIncomeRecord(
          date,
          primaryCurrency._id!,
          primaryWallet._id!,
          incomeSourcesMap.get("SALARY")?._id || incomeSourcesMap.get("DEFAULT")?._id || "",
          partiesMap.get("EMPLOYER")?._id || partiesMap.get("DEFAULT")?._id || "",
          [tagsMap.get("ESSENTIAL")?._id || "", tagsMap.get("RECURRING")?._id || ""].filter((id) => id),
          6500,
          "Monthly salary payment from employer - Software Engineer position"
        );
        await this.createRecord(incomeRecord);
        recordCount++;

        // Additional income source
        if (incomeSourcesMap.has("FREELANCE")) {
          const sideIncomeRecord = this.createIncomeRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            incomeSourcesMap.get("FREELANCE")!._id!,
            partiesMap.get("TECH_STARTUP")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("INVESTMENT")?._id || "", tagsMap.get("BUSINESS")?._id || ""].filter((id) => id),
            1200,
            "Freelance web development project for startup - E-commerce platform development"
          );
          await this.createRecord(sideIncomeRecord);
          recordCount++;
        }

        // Third income source for variety
        if (incomeSourcesMap.has("INVESTMENTS")) {
          const investmentIncomeRecord = this.createIncomeRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            incomeSourcesMap.get("INVESTMENTS")!._id!,
            partiesMap.get("INVESTMENT_BROKER")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("INVESTMENT")?._id || ""].filter((id) => id),
            450,
            "Quarterly dividend payment from mutual fund investments"
          );
          await this.createRecord(investmentIncomeRecord);
          recordCount++;
        }

        // Fourth income source - rental income
        if (incomeSourcesMap.has("RENTAL_INCOME")) {
          const rentalIncomeRecord = this.createIncomeRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            incomeSourcesMap.get("RENTAL_INCOME")!._id!,
            partiesMap.get("GLOBAL_INVESTMENT")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("INVESTMENT")?._id || "", tagsMap.get("RECURRING")?._id || ""].filter((id) => id),
            1800,
            "Monthly rental income from investment property - 2-bedroom apartment"
          );
          await this.createRecord(rentalIncomeRecord);
          recordCount++;
        }

        // Fifth income source - online sales
        if (incomeSourcesMap.has("ONLINE_SALES")) {
          const onlineSalesRecord = this.createIncomeRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            incomeSourcesMap.get("ONLINE_SALES")!._id!,
            partiesMap.get("AMAZON")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("INVESTMENT")?._id || "", tagsMap.get("BUSINESS")?._id || ""].filter((id) => id),
            350,
            "Monthly income from online course sales and affiliate marketing"
          );
          await this.createRecord(onlineSalesRecord);
          recordCount++;
        }

        // Sixth income source - interest income
        if (incomeSourcesMap.has("INTEREST_INCOME")) {
          const interestIncomeRecord = this.createIncomeRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            incomeSourcesMap.get("INTEREST_INCOME")!._id!,
            partiesMap.get("INVESTMENT_BROKER")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("INVESTMENT")?._id || ""].filter((id) => id),
            180,
            "Monthly interest earned from high-yield savings account"
          );
          await this.createRecord(interestIncomeRecord);
          recordCount++;
        }
      }

      // Expense records (throughout the month)
      if (isMiddleOfMonth || isEndOfMonth) {
        // Regular monthly expenses
        const expenseRecord = this.createExpenseRecord(
          date,
          primaryCurrency._id!,
          primaryWallet._id!,
          expenseAvenuesMap.get("GROCERY")?._id || expenseAvenuesMap.get("DEFAULT")?._id || "",
          partiesMap.get("GROCERY_STORE")?._id || partiesMap.get("DEFAULT")?._id || "",
          [tagsMap.get("ESSENTIAL")?._id || "", tagsMap.get("RECURRING")?._id || ""].filter((id) => id),
          350,
          "Weekly grocery shopping - fresh produce, dairy, and household items"
        );
        await this.createRecord(expenseRecord);
        recordCount++;

        // Additional expenses
        if (expenseAvenuesMap.has("RESTAURANT")) {
          const luxuryExpenseRecord = this.createExpenseRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            expenseAvenuesMap.get("RESTAURANT")!._id!,
            partiesMap.get("RESTAURANT")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("LUXURY")?._id || "", tagsMap.get("ONE_TIME")?._id || ""].filter((id) => id),
            180,
            "Dinner at upscale Italian restaurant - anniversary celebration with spouse"
          );
          await this.createRecord(luxuryExpenseRecord);
          recordCount++;
        }

        // Healthcare expense
        if (expenseAvenuesMap.has("HEALTHCARE")) {
          const healthcareExpenseRecord = this.createExpenseRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            expenseAvenuesMap.get("HEALTHCARE")!._id!,
            partiesMap.get("HEALTH_INSURANCE")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("ESSENTIAL")?._id || "", tagsMap.get("RECURRING")?._id || "", tagsMap.get("TAX_DEDUCTIBLE")?._id || ""].filter((id) => id),
            120,
            "Monthly health insurance premium payment"
          );
          await this.createRecord(healthcareExpenseRecord);
          recordCount++;
        }

        // Transportation expense
        if (expenseAvenuesMap.has("TRANSPORTATION")) {
          const transportExpenseRecord = this.createExpenseRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            expenseAvenuesMap.get("TRANSPORTATION")!._id!,
            partiesMap.get("TRANSIT_AUTHORITY")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("ESSENTIAL")?._id || "", tagsMap.get("RECURRING")?._id || ""].filter((id) => id),
            85,
            "Monthly public transportation pass for work commute"
          );
          await this.createRecord(transportExpenseRecord);
          recordCount++;
        }

        // Technology expense
        if (expenseAvenuesMap.has("TECHNOLOGY")) {
          const techExpenseRecord = this.createExpenseRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            expenseAvenuesMap.get("TECHNOLOGY")!._id!,
            partiesMap.get("TECH_STARTUP")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("INVESTMENT")?._id || "", tagsMap.get("BUSINESS")?._id || ""].filter((id) => id),
            75,
            "Monthly subscription for professional development courses and coding tools"
          );
          await this.createRecord(techExpenseRecord);
          recordCount++;
        }

        // Home & Garden expense
        if (expenseAvenuesMap.has("HOME_GARDEN")) {
          const homeExpenseRecord = this.createExpenseRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            expenseAvenuesMap.get("HOME_GARDEN")!._id!,
            partiesMap.get("HOME_DEPOT")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("ESSENTIAL")?._id || "", tagsMap.get("RECURRING")?._id || ""].filter((id) => id),
            200,
            "Monthly home maintenance and garden supplies - landscaping and repairs"
          );
          await this.createRecord(homeExpenseRecord);
          recordCount++;
        }

        // Shopping expense
        if (expenseAvenuesMap.has("SHOPPING")) {
          const shoppingExpenseRecord = this.createExpenseRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            expenseAvenuesMap.get("SHOPPING")!._id!,
            partiesMap.get("FASHION_BOUTIQUE")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("LUXURY")?._id || "", tagsMap.get("ONE_TIME")?._id || ""].filter((id) => id),
            150,
            "New clothing and accessories for upcoming business conference"
          );
          await this.createRecord(shoppingExpenseRecord);
          recordCount++;
        }

        // Fitness & Wellness expense
        if (expenseAvenuesMap.has("FITNESS_WELLNESS")) {
          const fitnessExpenseRecord = this.createExpenseRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            expenseAvenuesMap.get("FITNESS_WELLNESS")!._id!,
            partiesMap.get("GYM")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("ESSENTIAL")?._id || "", tagsMap.get("RECURRING")?._id || ""].filter((id) => id),
            95,
            "Monthly gym membership and personal training session"
          );
          await this.createRecord(fitnessExpenseRecord);
          recordCount++;
        }

        // Utilities expense
        if (expenseAvenuesMap.has("UTILITIES")) {
          const utilitiesExpenseRecord = this.createExpenseRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            expenseAvenuesMap.get("UTILITIES")!._id!,
            partiesMap.get("UTILITIES_COMPANY")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("ESSENTIAL")?._id || "", tagsMap.get("RECURRING")?._id || ""].filter((id) => id),
            180,
            "Monthly electricity, water, and internet bills"
          );
          await this.createRecord(utilitiesExpenseRecord);
          recordCount++;
        }

        // Coffee/Entertainment expense
        if (expenseAvenuesMap.has("ENTERTAINMENT")) {
          const coffeeExpenseRecord = this.createExpenseRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            expenseAvenuesMap.get("ENTERTAINMENT")!._id!,
            partiesMap.get("STARBUCKS")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("LUXURY")?._id || "", tagsMap.get("RECURRING")?._id || ""].filter((id) => id),
            45,
            "Weekly coffee and snacks at Starbucks - work break refreshments"
          );
          await this.createRecord(coffeeExpenseRecord);
          recordCount++;
        }

        // Online shopping expense
        if (expenseAvenuesMap.has("SHOPPING")) {
          const onlineExpenseRecord = this.createExpenseRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            expenseAvenuesMap.get("SHOPPING")!._id!,
            partiesMap.get("AMAZON")?._id || partiesMap.get("DEFAULT")?._id || "",
            [tagsMap.get("LUXURY")?._id || "", tagsMap.get("ONE_TIME")?._id || ""].filter((id) => id),
            120,
            "Amazon Prime subscription and new books for professional development"
          );
          await this.createRecord(onlineExpenseRecord);
          recordCount++;
        }
      }

      // Asset purchase records (occasionally)
      if (dayOfMonth === 15 || dayOfMonth === 28) {
        const assetPurchaseRecord = this.createAssetPurchaseRecord(
          date,
          primaryCurrency._id!,
          primaryWallet._id!,
          assetsMap.get("STOCK_PORTFOLIO")?._id! || assetsMap.get("DEFAULT")?._id!,
          partiesMap.get("INVESTMENT_BROKER")?._id! || partiesMap.get("DEFAULT")?._id!,
          [tagsMap.get("INVESTMENT")?._id!],
          1250,
          "Purchased 50 shares of tech company stock for long-term investment portfolio"
        );
        await this.createRecord(assetPurchaseRecord);
        recordCount++;

        // Additional asset purchase for variety
        if (dayOfMonth === 28 && assetsMap.has("GOLD_INVESTMENT")) {
          const goldPurchaseRecord = this.createAssetPurchaseRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            assetsMap.get("GOLD_INVESTMENT")!._id!,
            partiesMap.get("METALS_EXCHANGE")?._id! || partiesMap.get("DEFAULT")?._id!,
            [tagsMap.get("INVESTMENT")?._id!],
            800,
            "Purchased 5 grams of gold as inflation hedge and portfolio diversification"
          );
          await this.createRecord(goldPurchaseRecord);
          recordCount++;
        }
      }

      // Asset sale records (occasionally)
      if (dayOfMonth === 20) {
        const assetSaleRecord = this.createAssetSaleRecord(
          date,
          primaryCurrency._id!,
          primaryWallet._id!,
          assetsMap.get("GOLD_INVESTMENT")?._id! || assetsMap.get("DEFAULT")?._id!,
          partiesMap.get("INVESTMENT_BROKER")?._id! || partiesMap.get("DEFAULT")?._id!,
          [tagsMap.get("INVESTMENT")?._id!],
          950,
          "Sold gold investment due to market conditions and portfolio rebalancing needs"
        );
        await this.createRecord(assetSaleRecord);
        recordCount++;
      }

      // Money transfer records (between wallets)
      if (dayOfMonth === 5 || dayOfMonth === 20) {
        const moneyTransferRecord = this.createMoneyTransferRecord(
          date,
          primaryCurrency._id!,
          primaryWallet._id!,
          secondaryWallet._id!,
          [tagsMap.get("RECURRING")?._id!],
          800,
          "Monthly transfer to savings account for emergency fund building and future goals"
        );
        await this.createRecord(moneyTransferRecord);
        recordCount++;

        // Additional transfer for investment account
        if (dayOfMonth === 20 && allWallets.docs.length > 2) {
          const investmentTransferRecord = this.createMoneyTransferRecord(
            date,
            primaryCurrency._id!,
            primaryWallet._id!,
            allWallets.docs[2]._id!,
            [tagsMap.get("INVESTMENT")?._id!, tagsMap.get("RECURRING")?._id!],
            500,
            "Monthly transfer to investment account for automated dollar-cost averaging strategy"
          );
          await this.createRecord(investmentTransferRecord);
          recordCount++;
        }
      }

      // Lending records (occasionally)
      if (dayOfMonth === 10) {
        const lendingRecord = this.createLendingRecord(
          date,
          primaryCurrency._id!,
          primaryWallet._id!,
          partiesMap.get("GLOBAL_INVESTMENT")?._id! || partiesMap.get("DEFAULT")?._id!,
          [tagsMap.get("INVESTMENT")?._id!],
          3000,
          "Personal loan to friend for business startup - 6-month term with 5% annual interest rate"
        );
        await this.createRecord(lendingRecord);
        recordCount++;
      }

      // Borrowing records (occasionally)
      if (dayOfMonth === 12) {
        const borrowingRecord = this.createBorrowingRecord(
          date,
          primaryCurrency._id!,
          primaryWallet._id!,
          partiesMap.get("DEFAULT")?._id!,
          [tagsMap.get("EMERGENCY")?._id!],
          2000,
          "Emergency loan from family for unexpected car repair - transmission replacement, to be repaid in 3 months"
        );
        await this.createRecord(borrowingRecord);
        recordCount++;
      }

      // Repayment records (following lending/borrowing)
      if (dayOfMonth === 25) {
        const repaymentGivenRecord = this.createRepaymentGivenRecord(
          date,
          primaryCurrency._id!,
          primaryWallet._id!,
          partiesMap.get("GLOBAL_INVESTMENT")?._id! || partiesMap.get("DEFAULT")?._id!,
          [tagsMap.get("INVESTMENT")?._id!],
          600,
          "Monthly loan repayment installment - $500 principal + $100 interest for business startup loan"
        );
        await this.createRecord(repaymentGivenRecord);
        recordCount++;

        const repaymentReceivedRecord = this.createRepaymentReceivedRecord(
          date,
          primaryCurrency._id!,
          primaryWallet._id!,
          partiesMap.get("DEFAULT")?._id!,
          [tagsMap.get("EMERGENCY")?._id!],
          500,
          "Partial repayment received for emergency car repair loan - first installment of $500"
        );
        await this.createRecord(repaymentReceivedRecord);
        recordCount++;
      }

      // Asset appreciation/depreciation records (monthly)
      if (dayOfMonth === 30) {
        const appreciationRecord = this.createAssetAppreciationRecord(
          date,
          primaryCurrency._id!,
          assetsMap.get("STOCK_PORTFOLIO")?._id! || assetsMap.get("DEFAULT")?._id!,
          [tagsMap.get("INVESTMENT")?._id!],
          320,
          "Stock portfolio gained value due to strong quarterly earnings and broader market recovery - tech sector up 4.2%"
        );
        await this.createRecord(appreciationRecord);
        recordCount++;

        const depreciationRecord = this.createAssetDepreciationRecord(
          date,
          primaryCurrency._id!,
          assetsMap.get("GOLD_INVESTMENT")?._id! || assetsMap.get("DEFAULT")?._id!,
          [tagsMap.get("INVESTMENT")?._id!],
          150,
          "Gold investment decreased slightly due to strengthening dollar and market volatility - down 2.1% this month"
        );
        await this.createRecord(depreciationRecord);
        recordCount++;
      }
    }

    console.log(`Created ${recordCount} demo records successfully!`);
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
    const result = await pouchdbService.upsertDoc(record, { isDemoData: true, demoCreatedAt: Date.now() });
    const createdRecord = { ...record, _id: result.id, _rev: result.rev };
    this.createdRecords.push(createdRecord);
  }

  /**
   * Setup demo budgets (monthly and travel)
   */
  async setupDemoBudgets(): Promise<void> {
    if (!this.primaryCurrency) {
      console.log("No primary demo currency available, skipping budget creation");
      return;
    }

    // Use the primary demo currency for budgets
    const demoCurrency = this.primaryCurrency;
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

    // Create additional expense avenues (complements onboarding expense avenues)
    console.log("Creating additional demo expense avenues...");
    await this.setupDemoExpenseAvenues();
    console.log(`Created ${this.createdExpenseAvenues.length} additional expense avenues`);

    // Create additional income sources (complements onboarding income sources)
    console.log("Creating additional demo income sources...");
    await this.setupDemoIncomeSources();
    console.log(`Created ${this.createdIncomeSources.length} additional income sources`);

    // Create demo tags
    console.log("Creating additional demo tags...");
    await this.setupDemoTags();
    console.log(`Created ${this.createdTags.length} additional tags`);

    // Create comprehensive demo records
    console.log("Creating comprehensive demo records...");
    await this.setupDemoRecords();
    console.log(`Created ${this.createdRecords.length} additional records`);

    // Create demo budgets
    console.log("Creating demo budgets...");
    await this.setupDemoBudgets();
    console.log(`Created ${this.createdBudgets.length} additional budgets`);

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
      currencies: this.createdCurrencies,
      wallets: this.createdWallets,
      parties: this.createdParties,
      assets: this.createdAssets,
      budgets: this.createdBudgets,
      expenseAvenues: this.createdExpenseAvenues,
      incomeSources: this.createdIncomeSources,
      tags: this.createdTags,
      records: this.createdRecords,
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
      currencies: this.createdCurrencies.length,
      wallets: this.createdWallets.length,
      parties: this.createdParties.length,
      assets: this.createdAssets.length,
      budgets: this.createdBudgets.length,
      expenseAvenues: this.createdExpenseAvenues.length,
      incomeSources: this.createdIncomeSources.length,
      tags: this.createdTags.length,
      records: this.createdRecords.length,
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
      const demoDocs = docs.docs.filter((doc: any) => doc.isDemoData === true);
      console.log(`Found ${demoDocs.length} demo documents in ${collection}`);

      for (const doc of demoDocs) {
        await pouchdbService.removeDoc(doc, true);
      }
    }

    console.log("Demo data cleanup completed!");

    // Reset the primary currency
    this.primaryCurrency = null;
  }
}

export const demoPreparationService = new DemoPreparationService();
