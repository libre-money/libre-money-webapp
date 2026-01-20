import { Collection } from "src/constants/constants";
import type { Asset } from "src/schemas/asset";
import type { Currency } from "src/schemas/currency";
import type { Party } from "src/schemas/party";
import type { Wallet } from "src/schemas/wallet";
import type { RollingBudget } from "src/schemas/rolling-budget";
import type { Record } from "src/schemas/record";
import type { ExpenseAvenue } from "src/schemas/expense-avenue";
import type { IncomeSource } from "src/schemas/income-source";
import type { Tag } from "src/schemas/tag";
import { pouchdbService } from "./pouchdb-service";

type CreatedCounts = {
  currencies: number;
  wallets: number;
  parties: number;
  assets: number;
  budgets: number;
  expenseAvenues: number;
  incomeSources: number;
  tags: number;
  records: number;
};

class FamilyDemoPreparationServiceV2 {
  private currenciesMap = new Map<string, Currency>();
  private walletsMap = new Map<string, Wallet>();
  private partiesMap = new Map<string, Party>();
  private assetsMap = new Map<string, Asset>();
  private expenseAvenuesMap = new Map<string, ExpenseAvenue>();
  private incomeSourcesMap = new Map<string, IncomeSource>();
  private tagsMap = new Map<string, Tag>();

  private primaryCurrency: Currency | null = null;

  private createdCounts: CreatedCounts = {
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

  // Orchestration
  async setupAllDemoData(): Promise<void> {
    await this.populateExistingEntities();
    await this.ensurePrimaryCurrencyUSD();
    await this.createFamilyParties();
    await this.createFamilyWallets();
    await this.createFamilyTags();
    await this.createFamilyExpenseAvenues();
    await this.createFamilyIncomeSources();
    await this.createFamilyAssetsAndSellables();
    await this.createFamilyBudgets();
    await this.createFamilyLoans();
    await this.createPersonalLoansGiven();
    await this.generateSixMonthsRecords();
    await this.createQuickTemplates();
  }

  async clearAllDemoData(): Promise<void> {
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
      const docs = await pouchdbService.listByCollection(collection as any);
      const demoDocs = docs.docs.filter((doc: any) => doc.isDemoData === true);
      for (const doc of demoDocs) {
        await pouchdbService.removeDoc(doc, true);
      }
    }

    this.primaryCurrency = null;
    this.currenciesMap.clear();
    this.walletsMap.clear();
    this.partiesMap.clear();
    this.assetsMap.clear();
    this.expenseAvenuesMap.clear();
    this.incomeSourcesMap.clear();
    this.tagsMap.clear();
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

  getCreatedEntitiesCount(): CreatedCounts {
    return { ...this.createdCounts };
  }

  // Bootstrapping
  private async populateExistingEntities(): Promise<void> {
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

    this.currenciesMap.clear();
    this.walletsMap.clear();
    this.partiesMap.clear();
    this.assetsMap.clear();
    this.expenseAvenuesMap.clear();
    this.incomeSourcesMap.clear();
    this.tagsMap.clear();

    existingCurrencies.docs.forEach((c) => this.currenciesMap.set(c.name, c));
    existingWallets.docs.forEach((w) => this.walletsMap.set(w.name, w));
    existingParties.docs.forEach((p) => this.partiesMap.set(p.name, p));
    existingAssets.docs.forEach((a) => this.assetsMap.set(a.name, a));
    existingExpenseAvenues.docs.forEach((e) => this.expenseAvenuesMap.set(e.name, e));
    existingIncomeSources.docs.forEach((i) => this.incomeSourcesMap.set(i.name, i));
    existingTags.docs.forEach((t) => this.tagsMap.set(t.name, t));

    // Try to detect a reasonable default primary currency
    const usd = existingCurrencies.docs.find((c) => c.name === "US Dollar" || c.sign === "$") || null;
    this.primaryCurrency = usd ?? existingCurrencies.docs[0] ?? null;
  }

  private async ensurePrimaryCurrencyUSD(): Promise<void> {
    const existingUsd = Array.from(this.currenciesMap.values()).find((c) => c.name === "US Dollar" || c.sign === "$");
    if (existingUsd) {
      this.primaryCurrency = existingUsd;
      return;
    }

    const usd: Currency = {
      $collection: Collection.CURRENCY,
      name: "US Dollar",
      sign: "$",
      precisionMinimum: 2,
      precisionMaximum: 2,
    } as Currency;

    const result = await pouchdbService.upsertDoc(usd, { isDemoData: true, demoCreatedAt: Date.now() });
    const created = { ...usd, _id: result.id, _rev: result.rev } as Currency & { _id: string; _rev: string };
    this.currenciesMap.set(created.name, created);
    this.primaryCurrency = created;
    this.createdCounts.currencies += 1;
  }

  // Entities for the family of 4 demo
  private async createFamilyParties(): Promise<void> {
    const parties: Party[] = [
      { $collection: Collection.PARTY, name: "Ethan", type: "party" } as Party, // Husband
      { $collection: Collection.PARTY, name: "Maya", type: "party" } as Party, // Wife
      { $collection: Collection.PARTY, name: "Alex", type: "party" } as Party, // Son 1
      { $collection: Collection.PARTY, name: "Jason", type: "party" } as Party, // Son 2

      { $collection: Collection.PARTY, name: "Bank of America", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Blue Shield Insurance", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Lincoln Elementary School", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Roosevelt Middle School", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Eastside Karate Academy", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Westside Football Club", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Local Grocery Market", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Shell Fuel Station", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Sparkle Car Wash", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Downtown Barber", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "City Salon & Spa", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "City Water Utility", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "City Electric Utility", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "City Gas Utility", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Sunrise Gift Shop", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Happy Paws Pet Store", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Oakwood Veterinary Clinic", type: "vendor" } as Party,
      { $collection: Collection.PARTY, name: "Home Baking Supplies", type: "vendor" } as Party,

      { $collection: Collection.PARTY, name: "Gerry (Office)", type: "party" } as Party,
      { $collection: Collection.PARTY, name: "Mother", type: "party" } as Party,
      { $collection: Collection.PARTY, name: "Jimmy (Neighbour)", type: "party" } as Party,
    ];

    for (const party of parties) {
      if (this.partiesMap.has(party.name)) continue;
      const result = await pouchdbService.upsertDoc(party, { isDemoData: true, demoCreatedAt: Date.now() });
      const created = { ...party, _id: result.id, _rev: result.rev } as Party & { _id: string; _rev: string };
      this.partiesMap.set(created.name, created);
      this.createdCounts.parties += 1;
    }
  }

  private async createFamilyWallets(): Promise<void> {
    if (!this.primaryCurrency || !this.primaryCurrency._id) return;
    const currencyId = this.primaryCurrency._id;

    // Try to reuse onboarding wallets by common names/aliases
    const alias = (names: string[]): Wallet | null => {
      for (const n of names) {
        const w = this.walletsMap.get(n);
        if (w) return w;
      }
      return null;
    };

    const ensureWallet = async (preferredName: string, fallback: Wallet, aliases: string[]) => {
      const existing = alias([preferredName, ...aliases]);
      if (existing) {
        // Alias to preferred name for downstream lookups
        this.walletsMap.set(preferredName, existing);
        return existing;
      }
      const result = await pouchdbService.upsertDoc(fallback, { isDemoData: true, demoCreatedAt: Date.now() });
      const created = { ...fallback, _id: result.id, _rev: result.rev } as Wallet & { _id: string; _rev: string };
      this.walletsMap.set(created.name, created);
      this.createdCounts.wallets += 1;
      return created;
    };

    await ensureWallet(
      "Household Checking",
      {
        $collection: Collection.WALLET,
        name: "Household Checking",
        type: "bank",
        initialBalance: 6000,
        currencyId,
        minimumBalance: 0,
      } as unknown as Wallet,
      ["Checking Account", "Main Checking", "Checking"]
    );

    await ensureWallet(
      "Emergency Savings",
      {
        $collection: Collection.WALLET,
        name: "Emergency Savings",
        type: "bank",
        initialBalance: 12000,
        currencyId,
        minimumBalance: 0,
      } as unknown as Wallet,
      ["Savings Account", "Emergency Fund", "Savings"]
    );

    await ensureWallet(
      "Cash",
      {
        $collection: Collection.WALLET,
        name: "Cash",
        type: "cash",
        initialBalance: 500,
        currencyId,
        minimumBalance: 0,
      } as unknown as Wallet,
      ["Wallet Cash", "Cash in Hand", "Cash"]
    );

    await ensureWallet(
      "Credit Card",
      {
        $collection: Collection.WALLET,
        name: "Credit Card",
        type: "card",
        initialBalance: -150,
        currencyId,
        minimumBalance: -5000,
      } as unknown as Wallet,
      ["Credit Card", "Visa", "Mastercard", "Credit"]
    );

    // Ensure credit card limit is set to -5000 even if reused from onboarding
    const existingCard = this.walletsMap.get("Credit Card");
    if (existingCard && (existingCard as any).minimumBalance !== -5000) {
      const updated = { ...(existingCard as any), minimumBalance: -5000 } as Wallet & { _id: string; _rev?: string };
      const result = await pouchdbService.upsertDoc(updated, { isDemoData: (existingCard as any).isDemoData ?? true, demoCreatedAt: Date.now() });
      const created = { ...updated, _id: result.id, _rev: result.rev } as Wallet & { _id: string; _rev: string };
      this.walletsMap.set("Credit Card", created);
    }
  }

  private async createFamilyAssetsAndSellables(): Promise<void> {
    if (!this.primaryCurrency || !this.primaryCurrency._id) return;
    const currencyId = this.primaryCurrency._id;

    const assets: Asset[] = [
      { $collection: Collection.ASSET, name: "Home", type: "real-estate", liquidity: "low", initialBalance: 320000, currencyId } as unknown as Asset,
      { $collection: Collection.ASSET, name: "Car", type: "vehicle", liquidity: "moderate", initialBalance: 14000, currencyId } as unknown as Asset,
      { $collection: Collection.ASSET, name: "TV", type: "sellable", liquidity: "high", initialBalance: 500, currencyId } as unknown as Asset,
      { $collection: Collection.ASSET, name: "Double door fridge", type: "sellable", liquidity: "high", initialBalance: 700, currencyId } as unknown as Asset,
      { $collection: Collection.ASSET, name: "PS5", type: "sellable", liquidity: "high", initialBalance: 350, currencyId } as unknown as Asset,
      {
        $collection: Collection.ASSET,
        name: "Old Chevrolet car",
        type: "vehicle",
        liquidity: "moderate",
        initialBalance: 2500,
        currencyId,
      } as unknown as Asset,
    ];

    for (const asset of assets) {
      if (this.assetsMap.has(asset.name)) continue;
      const result = await pouchdbService.upsertDoc(asset, { isDemoData: true, demoCreatedAt: Date.now() });
      const created = { ...asset, _id: result.id, _rev: result.rev } as Asset & { _id: string; _rev: string };
      this.assetsMap.set(created.name, created);
      this.createdCounts.assets += 1;
    }
  }

  private async createFamilyExpenseAvenues(): Promise<void> {
    const avenues: ExpenseAvenue[] = [
      { $collection: Collection.EXPENSE_AVENUE, name: "Grocery" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Mortgage" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Medical Insurance Family Pack" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "School Tuition - Alex" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "School Tuition - Jason" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Karate Lessons - Alex" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Football Lessons - Jason" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Barber - Ethan" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Salon - Maya" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Car Fuel" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Car Wash" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Baking Item Expense" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Water Bill" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Electricity Bill" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Gas Bill" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Gifts & Celebrations" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Pet Dog Food" } as ExpenseAvenue,
      { $collection: Collection.EXPENSE_AVENUE, name: "Pet Dog Vet Bill" } as ExpenseAvenue,
    ];

    for (const avenue of avenues) {
      if (this.expenseAvenuesMap.has(avenue.name)) continue;
      const result = await pouchdbService.upsertDoc(avenue, { isDemoData: true, demoCreatedAt: Date.now() });
      const created = { ...avenue, _id: result.id, _rev: result.rev } as ExpenseAvenue & { _id: string; _rev: string };
      this.expenseAvenuesMap.set(created.name, created);
      this.createdCounts.expenseAvenues += 1;
    }
  }

  private async createFamilyIncomeSources(): Promise<void> {
    const sources: IncomeSource[] = [
      { $collection: Collection.INCOME_SOURCE, name: "Husband Salary" } as IncomeSource,
      { $collection: Collection.INCOME_SOURCE, name: "Wife Salary" } as IncomeSource,
      { $collection: Collection.INCOME_SOURCE, name: "Side Gig - Baking" } as IncomeSource,
    ];

    for (const src of sources) {
      if (this.incomeSourcesMap.has(src.name)) continue;
      const result = await pouchdbService.upsertDoc(src, { isDemoData: true, demoCreatedAt: Date.now() });
      const created = { ...src, _id: result.id, _rev: result.rev } as IncomeSource & { _id: string; _rev: string };
      this.incomeSourcesMap.set(created.name, created);
      this.createdCounts.incomeSources += 1;
    }
  }

  private async createFamilyTags(): Promise<void> {
    const tags: Tag[] = [
      { $collection: Collection.TAG, name: "Grocery", color: "#4CAF50" } as Tag,
      { $collection: Collection.TAG, name: "Medical", color: "#F44336" } as Tag,
      { $collection: Collection.TAG, name: "Splurge", color: "#9C27B0" } as Tag,
      { $collection: Collection.TAG, name: "Family Time", color: "#03A9F4" } as Tag,
      { $collection: Collection.TAG, name: "Gift", color: "#FFC107" } as Tag,
      { $collection: Collection.TAG, name: "Celebration", color: "#FF9800" } as Tag,
      { $collection: Collection.TAG, name: "Re-evaluate", color: "#795548" } as Tag,
      { $collection: Collection.TAG, name: "Gig", color: "#8BC34A" } as Tag,
    ];

    for (const tag of tags) {
      if (this.tagsMap.has(tag.name)) continue;
      const result = await pouchdbService.upsertDoc(tag, { isDemoData: true, demoCreatedAt: Date.now() });
      const created = { ...tag, _id: result.id, _rev: result.rev } as Tag & { _id: string; _rev: string };
      this.tagsMap.set(created.name, created);
      this.createdCounts.tags += 1;
    }
  }

  private async createFamilyBudgets(): Promise<void> {
    if (!this.primaryCurrency || !this.primaryCurrency._id) return;
    const currencyId = this.primaryCurrency._id;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const byTag = (name: string) => this.tagsMap.get(name)?._id ?? null;

    const budgets: RollingBudget[] = [
      {
        $collection: Collection.ROLLING_BUDGET,
        name: "Grocery Budget",
        includeExpenses: true,
        includeAssetPurchases: false,
        tagIdWhiteList: [byTag("Grocery")!].filter(Boolean) as string[],
        tagIdBlackList: [],
        frequency: "monthly",
        budgetedPeriodList: [
          {
            startEpoch: startOfMonth.getTime(),
            endEpoch: endOfMonth.getTime(),
            title: `${startOfMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
            allocatedAmount: 900,
            rolledOverAmount: 0,
            totalAllocatedAmount: 900,
            heldAmount: 0,
            usedAmount: 0,
            remainingAmount: 900,
            calculatedEpoch: Date.now(),
          },
        ],
        rollOverRule: "positive-only",
        isFeatured: true,
        currencyId,
        monthlyStartDate: 1,
        monthlyEndDate: 31,
      } as RollingBudget,
      {
        $collection: Collection.ROLLING_BUDGET,
        name: "Medical emergency bill",
        includeExpenses: true,
        includeAssetPurchases: false,
        tagIdWhiteList: [byTag("Medical")!].filter(Boolean) as string[],
        tagIdBlackList: [],
        frequency: "monthly",
        budgetedPeriodList: [
          {
            startEpoch: startOfMonth.getTime(),
            endEpoch: endOfMonth.getTime(),
            title: `${startOfMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
            allocatedAmount: 250,
            rolledOverAmount: 0,
            totalAllocatedAmount: 250,
            heldAmount: 0,
            usedAmount: 0,
            remainingAmount: 250,
            calculatedEpoch: Date.now(),
          },
        ],
        rollOverRule: "always",
        isFeatured: false,
        currencyId,
        monthlyStartDate: 1,
        monthlyEndDate: 31,
      } as RollingBudget,
      {
        $collection: Collection.ROLLING_BUDGET,
        name: "Family time",
        includeExpenses: true,
        includeAssetPurchases: false,
        tagIdWhiteList: [byTag("Family time")!].filter(Boolean) as string[],
        tagIdBlackList: [],
        frequency: "monthly",
        budgetedPeriodList: [
          {
            startEpoch: startOfMonth.getTime(),
            endEpoch: endOfMonth.getTime(),
            title: `${startOfMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
            allocatedAmount: 200,
            rolledOverAmount: 0,
            totalAllocatedAmount: 200,
            heldAmount: 0,
            usedAmount: 0,
            remainingAmount: 200,
            calculatedEpoch: Date.now(),
          },
        ],
        rollOverRule: "never",
        isFeatured: false,
        currencyId,
        monthlyStartDate: 1,
        monthlyEndDate: 31,
      } as RollingBudget,
      {
        $collection: Collection.ROLLING_BUDGET,
        name: "Splurge",
        includeExpenses: true,
        includeAssetPurchases: false,
        tagIdWhiteList: [byTag("Splurge")!].filter(Boolean) as string[],
        tagIdBlackList: [],
        frequency: "monthly",
        budgetedPeriodList: [
          {
            startEpoch: startOfMonth.getTime(),
            endEpoch: endOfMonth.getTime(),
            title: `${startOfMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
            allocatedAmount: 150,
            rolledOverAmount: 0,
            totalAllocatedAmount: 150,
            heldAmount: 0,
            usedAmount: 0,
            remainingAmount: 150,
            calculatedEpoch: Date.now(),
          },
        ],
        rollOverRule: "positive-only",
        isFeatured: false,
        currencyId,
        monthlyStartDate: 1,
        monthlyEndDate: 31,
      } as RollingBudget,
    ];

    for (const budget of budgets) {
      const result = await pouchdbService.upsertDoc(budget, { isDemoData: true, demoCreatedAt: Date.now() });
      if (result && result.id) this.createdCounts.budgets += 1;
    }
  }

  // Loans and lending
  private async createFamilyLoans(): Promise<void> {
    if (!this.primaryCurrency || !this.primaryCurrency._id) return;
    const currencyId = this.primaryCurrency._id;
    const checking = this.walletsMap.get("Household Checking");
    const lender = this.partiesMap.get("Bank of America");
    const today = new Date();

    if (checking && lender) {
      const mortgage = this.createBorrowingRecord(today, currencyId, checking._id!, lender._id!, [], 12000, "Mortgage balance setup for demo");
      await pouchdbService.upsertDoc(mortgage, { isDemoData: true, demoCreatedAt: Date.now() });
      this.createdCounts.records += 1;
    }

    const carLender = lender; // reuse generic lender for simplicity
    if (checking && carLender) {
      const carLoan = this.createBorrowingRecord(today, currencyId, checking._id!, carLender._id!, [], 5800, "Car loan balance setup for demo");
      await pouchdbService.upsertDoc(carLoan, { isDemoData: true, demoCreatedAt: Date.now() });
      this.createdCounts.records += 1;
    }
  }

  private async createPersonalLoansGiven(): Promise<void> {
    if (!this.primaryCurrency || !this.primaryCurrency._id) return;
    const currencyId = this.primaryCurrency._id;
    const checking = this.walletsMap.get("Household Checking");
    const today = new Date();
    if (!checking) return;

    const entries: { name: string; amount: number }[] = [
      { name: "Gerry (Office)", amount: 200 },
      { name: "Mother", amount: 400 },
      { name: "Jimmy (Neighbour)", amount: 800 },
    ];

    for (const e of entries) {
      const party = this.partiesMap.get(e.name);
      if (!party) continue;
      const rec = this.createLendingRecord(today, currencyId, checking._id!, party._id!, [], e.amount, `Personal loan given to ${e.name}`);
      await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
      this.createdCounts.records += 1;
    }
  }

  // Records generator (6 months)
  private async generateSixMonthsRecords(): Promise<void> {
    if (!this.primaryCurrency || !this.primaryCurrency._id) return;
    const currencyId = this.primaryCurrency._id;
    const checking = this.walletsMap.get("Household Checking");
    if (!checking || !checking._id) return;
    const creditCard = this.walletsMap.get("Credit Card");
    const cash = this.walletsMap.get("Cash");

    const { start, end } = this.getSixMonthPeriod();
    const months = this.enumerateMonthlyDates(start, end);

    const byIncome = (name: string) => this.incomeSourcesMap.get(name)?._id ?? null;
    const byAvenue = (name: string) => this.expenseAvenuesMap.get(name)?._id ?? null;
    const byParty = (name: string) => this.partiesMap.get(name)?._id ?? null;
    const byTag = (name: string) => this.tagsMap.get(name)?._id ?? null;

    let monthIndex = 0;
    for (const m of months) {
      const y = m.getFullYear();
      const mon = m.getMonth();

      // Income on 1st
      const first = new Date(y, mon, 1);
      const husbandIncomeId = byIncome("Husband Salary");
      const wifeIncomeId = byIncome("Wife Salary");
      const sideGigId = byIncome("Side Gig - Baking");
      if (husbandIncomeId) {
        const rec = this.createIncomeRecord(first, currencyId, checking._id!, husbandIncomeId, byParty("Ethan"), [], 5200, "Ethan monthly salary");
        await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }
      if (wifeIncomeId) {
        const rec = this.createIncomeRecord(first, currencyId, checking._id!, wifeIncomeId, byParty("Maya"), [], 3800, "Maya monthly salary");
        await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }
      if (sideGigId) {
        const rec = this.createIncomeRecord(
          new Date(y, mon, 12),
          currencyId,
          checking._id!,
          sideGigId,
          byParty("Maya"),
          [byTag("Gig")!].filter(Boolean) as string[],
          450,
          "Baking side gig income"
        );
        await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }

      // Loan repayments as outflows (use repayment-given)
      const lenderId = byParty("Bank of America");
      if (lenderId) {
        const mortgagePay = this.createRepaymentGivenRecord(new Date(y, mon, 2), currencyId, checking._id!, lenderId, [], 1500, "Mortgage monthly payment");
        await pouchdbService.upsertDoc(mortgagePay, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
        const carPay = this.createRepaymentGivenRecord(new Date(y, mon, 13), currencyId, checking._id!, lenderId, [], 320, "Car loan monthly payment");
        await pouchdbService.upsertDoc(carPay, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }

      // Fixed monthly expenses (non-loan)
      const expenses: { d: number; avenue: string; party?: string; amount: number; tag?: string }[] = [
        { d: 3, avenue: "Medical Insurance Family Pack", party: "Blue Shield Insurance", amount: 380 },
        { d: 4, avenue: "School Tuition - Alex", party: "Lincoln Elementary School", amount: 300 },
        { d: 4, avenue: "School Tuition - Jason", party: "Roosevelt Middle School", amount: 420 },
        { d: 5, avenue: "Water Bill", party: "City Water Utility", amount: 45 },
        { d: 6, avenue: "Electricity Bill", party: "City Electric Utility", amount: 120 },
        { d: 7, avenue: "Gas Bill", party: "City Gas Utility", amount: 60 },
        { d: 8, avenue: "Husband Salon", party: "Downtown Barber", amount: 25, tag: "Splurge" },
        { d: 15, avenue: "Wife Salon", party: "City Salon & Spa", amount: 40, tag: "Splurge" },
        { d: 9, avenue: "Karate Lessons - Alex", party: "Eastside Karate Academy", amount: 55, tag: "Family Time" },
        { d: 10, avenue: "Football Lessons - Jason", party: "Westside Football Club", amount: 65, tag: "Family Time" },
      ];

      for (const e of expenses) {
        const avenueId = byAvenue(e.avenue);
        if (!avenueId) continue;
        const date = new Date(y, mon, e.d);
        const tagIds = e.tag ? ([byTag(e.tag)!].filter(Boolean) as string[]) : [];
        const noteMap: { [key: string]: string[] } = {
          "Medical Insurance Family Pack": ["Family plan premium"],
          "School Tuition - Alex": ["Monthly tuition for Alex"],
          "School Tuition - Jason": ["Monthly tuition for Jason"],
          "Water Bill": ["Monthly water bill"],
          "Electricity Bill": ["Monthly electricity bill"],
          "Gas Bill": ["Monthly gas bill"],
          "Husband Salon": ["Haircut - Ethan"],
          "Wife Salon": ["Salon visit - Maya"],
          "Karate Lessons - Alex": ["Karate class fees - Alex"],
          "Football Lessons - Jason": ["Football training fees - Jason"],
        };
        const note = noteMap[e.avenue] ? noteMap[e.avenue][0] : e.avenue;
        const rec = this.createExpenseRecord(date, currencyId, checking._id!, avenueId, e.party ? byParty(e.party) : null, tagIds, e.amount, note);
        await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }

      // Variable monthly expenses
      const groceryAvenue = byAvenue("Grocery");
      if (groceryAvenue) {
        const trips = [5, 12, 19, 26];
        for (const d of trips) {
          const amt = 140 + Math.floor(Math.random() * 40); // 140-179
          const rec = this.createExpenseRecord(
            new Date(y, mon, d),
            currencyId,
            Math.random() < 0.25 && creditCard?._id ? creditCard._id! : checking._id!,
            groceryAvenue,
            byParty("Local Grocery Market"),
            [byTag("Grocery")!].filter(Boolean) as string[],
            amt,
            Math.random() < 0.5 ? "Groceries: produce, dairy, snacks" : "Weekly groceries: fruits, veggies, milk"
          );
          await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
          this.createdCounts.records += 1;
        }
      }

      const fuelAvenue = byAvenue("Car Fuel");
      if (fuelAvenue) {
        const fills = [7, 18];
        for (const d of fills) {
          const amt = 55 + Math.floor(Math.random() * 15);
          const rec = this.createExpenseRecord(
            new Date(y, mon, d),
            currencyId,
            Math.random() < 0.7 && creditCard?._id ? creditCard._id! : checking._id!,
            fuelAvenue,
            byParty("Shell Fuel Station"),
            [],
            amt,
            Math.random() < 0.5 ? "Gas fill-up" : "Fuel top-up"
          );
          await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
          this.createdCounts.records += 1;
        }
      }

      const washAvenue = byAvenue("Car Wash");
      if (washAvenue) {
        const rec = this.createExpenseRecord(
          new Date(y, mon, 20),
          currencyId,
          cash?._id ? cash._id! : checking._id!,
          washAvenue,
          byParty("Sparkle Car Wash"),
          [],
          15,
          Math.random() < 0.5 ? "Exterior wash" : "Quick car wash"
        );
        await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }

      const bakingAvenue = byAvenue("Baking Item Expense");
      if (bakingAvenue) {
        const rec = this.createExpenseRecord(
          new Date(y, mon, 14),
          currencyId,
          checking._id!,
          bakingAvenue,
          byParty("Home Baking Supplies"),
          [byTag("Gig")!].filter(Boolean) as string[],
          85,
          Math.random() < 0.5 ? "Flour, sugar, butter for cupcake order" : "Chocolate chips and vanilla extract"
        );
        await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }

      const giftsAvenue = byAvenue("Gifts & Celebrations");
      if (giftsAvenue) {
        const rec = this.createExpenseRecord(
          new Date(y, mon, 22),
          currencyId,
          Math.random() < 0.5 && creditCard?._id ? creditCard._id! : cash?._id ? cash._id! : checking._id!,
          giftsAvenue,
          byParty("Sunrise Gift Shop"),
          [byTag("Gift")!].filter(Boolean) as string[],
          60,
          Math.random() < 0.5 ? "Toy car for Jason" : "Board game for family night"
        );
        await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }

      const petFoodAvenue = byAvenue("Pet Dog Food");
      if (petFoodAvenue) {
        const rec = this.createExpenseRecord(
          new Date(y, mon, 11),
          currencyId,
          cash?._id ? cash._id! : checking._id!,
          petFoodAvenue,
          byParty("Happy Paws Pet Store"),
          [],
          45,
          Math.random() < 0.5 ? "Dog kibble and treats" : "Bulk dry food bag"
        );
        await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }

      const petVetAvenue = byAvenue("Pet Dog Vet Bill");
      if (petVetAvenue && mon % 3 === 0) {
        const rec = this.createExpenseRecord(
          new Date(y, mon, 16),
          currencyId,
          checking._id!,
          petVetAvenue,
          byParty("Oakwood Veterinary Clinic"),
          [byTag("Medical")!].filter(Boolean) as string[],
          95,
          Math.random() < 0.5 ? "Annual vaccination" : "General check-up"
        );
        await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }

      // Monthly transfer to savings
      const savings = this.walletsMap.get("Emergency Savings");
      if (savings && savings._id) {
        const xfer = this.createMoneyTransferRecord(new Date(y, mon, 5), currencyId, checking._id!, savings._id!, [], 600, "Monthly savings transfer");
        await pouchdbService.upsertDoc(xfer, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }

      // Monthly cash top-up to avoid negative cash
      if (cash && cash._id) {
        const cashTopUp = this.createMoneyTransferRecord(new Date(y, mon, 6), currencyId, checking._id!, cash._id!, [], 250, "Monthly cash withdrawal");
        await pouchdbService.upsertDoc(cashTopUp, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }

      // Family time outing once per month
      const familyTimeTag = byTag("Family Time");
      const outingAvenue = byAvenue("Gifts & Celebrations");
      if (outingAvenue && familyTimeTag) {
        const day = 23; // later in month
        const amt = 40 + Math.floor(Math.random() * 30); // 40-69
        const rec = this.createExpenseRecord(
          new Date(y, mon, day),
          currencyId,
          checking._id!,
          outingAvenue,
          byParty("Sunrise Gift Shop"),
          [familyTimeTag],
          amt,
          Math.random() < 0.5 ? "Movie night tickets" : "Ice cream outing"
        );
        await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
        this.createdCounts.records += 1;
      }

      // Repayments received for personal loans over first few months
      const borrowers: { name: string; total: number; months: number }[] = [
        { name: "Gerry (Office)", total: 200, months: 2 },
        { name: "Mother", total: 400, months: 4 },
        { name: "Jimmy (Neighbour)", total: 800, months: 4 },
      ];
      for (const b of borrowers) {
        if (monthIndex < b.months) {
          const partyId = byParty(b.name);
          if (partyId) {
            const installment = Math.round((b.total / b.months) * 100) / 100;
            const rr = this.createRepaymentReceivedRecord(
              new Date(y, mon, 25),
              currencyId,
              checking._id!,
              partyId,
              [],
              installment,
              `Repayment from ${b.name}`
            );
            await pouchdbService.upsertDoc(rr, { isDemoData: true, demoCreatedAt: Date.now() });
            this.createdCounts.records += 1;
          }
        }
      }

      monthIndex += 1;
    }
  }

  // Record helpers (signatures only)
  private createIncomeRecord(
    date: Date,
    currencyId: string,
    walletId: string,
    incomeSourceId: string,
    partyId: string | null,
    tagIds: string[],
    amount: number,
    notes: string
  ): Record {
    return {
      $collection: Collection.RECORD,
      notes,
      type: "income",
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
    } as Record;
  }

  private createExpenseRecord(
    date: Date,
    currencyId: string,
    walletId: string,
    expenseAvenueId: string,
    partyId: string | null,
    tagIds: string[],
    amount: number,
    notes: string
  ): Record {
    return {
      $collection: Collection.RECORD,
      notes,
      type: "expense",
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
    } as Record;
  }

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
      notes,
      type: "money-transfer",
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
    } as Record;
  }

  private createLendingRecord(date: Date, currencyId: string, walletId: string, partyId: string, tagIds: string[], amount: number, notes: string): Record {
    return {
      $collection: Collection.RECORD,
      notes,
      type: "lending",
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      lending: { amount, walletId, currencyId, partyId },
    } as Record;
  }

  private createBorrowingRecord(date: Date, currencyId: string, walletId: string, partyId: string, tagIds: string[], amount: number, notes: string): Record {
    return {
      $collection: Collection.RECORD,
      notes,
      type: "borrowing",
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      borrowing: { amount, walletId, currencyId, partyId },
    } as Record;
  }

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
      notes,
      type: "repayment-given",
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      repaymentGiven: { amount, walletId, currencyId, partyId },
    } as Record;
  }

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
      notes,
      type: "repayment-received",
      tagIdList: tagIds,
      transactionEpoch: date.getTime(),
      repaymentReceived: { amount, walletId, currencyId, partyId },
    } as Record;
  }

  // Quick templates
  private async createQuickTemplates(): Promise<void> {
    // Templates are regular records with a templateName; user can pick and edit before saving.
    if (!this.primaryCurrency || !this.primaryCurrency._id) return;
    const currencyId = this.primaryCurrency._id;
    const checking = this.walletsMap.get("Household Checking");
    const creditCard = this.walletsMap.get("Credit Card");
    if (!checking) return;

    const groceryAvenue = this.expenseAvenuesMap.get("Grocery");
    const fuelAvenue = this.expenseAvenuesMap.get("Car Fuel");

    if (groceryAvenue) {
      const rec: Record = {
        $collection: Collection.RECORD_TEMPLATE,
        notes: "Weekly groceries",
        type: "expense",
        tagIdList: [this.tagsMap.get("Grocery")?._id!].filter(Boolean) as string[],
        transactionEpoch: Date.now(),
        templateName: "Weekly Groceries",
        expense: {
          expenseAvenueId: groceryAvenue._id!,
          amount: 160,
          currencyId,
          partyId: this.partiesMap.get("Local Grocery Market")?._id || null,
          walletId: checking._id!,
          amountPaid: 160,
          amountUnpaid: 0,
        },
      };
      await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
    }

    if (fuelAvenue && creditCard) {
      const rec: Record = {
        $collection: Collection.RECORD_TEMPLATE,
        notes: "Fuel refill",
        type: "expense",
        tagIdList: [],
        transactionEpoch: Date.now(),
        templateName: "Fuel Refill",
        expense: {
          expenseAvenueId: fuelAvenue._id!,
          amount: 65,
          currencyId,
          partyId: this.partiesMap.get("Shell Fuel Station")?._id || null,
          walletId: creditCard._id!,
          amountPaid: 65,
          amountUnpaid: 0,
        },
      };
      await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
    }

    // 3) Car Wash (usually paid in cash)
    const washAvenue = this.expenseAvenuesMap.get("Car Wash");
    const cashWallet = this.walletsMap.get("Cash");
    if (washAvenue && (cashWallet || checking)) {
      const rec: Record = {
        $collection: Collection.RECORD_TEMPLATE,
        notes: "Quick car wash",
        type: "expense",
        tagIdList: [],
        transactionEpoch: Date.now(),
        templateName: "Car Wash",
        expense: {
          expenseAvenueId: washAvenue._id!,
          amount: 15,
          currencyId,
          partyId: this.partiesMap.get("Sparkle Car Wash")?._id || null,
          walletId: (cashWallet?._id ?? checking._id!) as string,
          amountPaid: 15,
          amountUnpaid: 0,
        },
      };
      await pouchdbService.upsertDoc(rec, { isDemoData: true, demoCreatedAt: Date.now() });
    }
  }

  // Date helpers
  private getSixMonthPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    return { start, end };
  }

  private enumerateMonthlyDates(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      dates.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    return dates;
  }
}

export const demoPreparationServiceV2 = new FamilyDemoPreparationServiceV2();
