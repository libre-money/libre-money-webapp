import { Collection } from "src/constants/constants";
import { Asset } from "src/models/asset";
import { Currency } from "src/models/currency";
import { Party } from "src/models/party";
import { Wallet } from "src/models/wallet";
import { pouchdbService } from "./pouchdb-service";

class DemoPreparationService {
  /**
   * Setup demo currencies (USD and BDT)
   */
  async setupDemoCurrencies(): Promise<Currency[]> {
    const currencies: Currency[] = [
      {
        $collection: Collection.CURRENCY,
        name: "US Dollar",
        sign: "$",
        precisionMinimum: 2,
        precisionMaximum: 2,
      },
      {
        $collection: Collection.CURRENCY,
        name: "Bangladeshi Taka",
        sign: "৳",
        precisionMinimum: 2,
        precisionMaximum: 2,
      },
    ];

    const createdCurrencies: Currency[] = [];
    for (const currency of currencies) {
      const result = await pouchdbService.upsertDoc(currency, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdCurrency = { ...currency, _id: result.id, _rev: result.rev };
      createdCurrencies.push(createdCurrency);
    }

    return createdCurrencies;
  }

  /**
   * Setup demo wallets
   */
  async setupDemoWallets(currencies: Currency[]): Promise<Wallet[]> {
    const usdCurrency = currencies.find((c) => c.sign === "$");
    const bdtCurrency = currencies.find((c) => c.sign === "৳");

    if (!usdCurrency || !bdtCurrency) {
      throw new Error("Required currencies not found");
    }

    const wallets: Wallet[] = [
      {
        $collection: Collection.WALLET,
        name: "Cash Wallet",
        type: "cash",
        initialBalance: 1000,
        currencyId: usdCurrency._id!,
        minimumBalance: 0,
      },
      {
        $collection: Collection.WALLET,
        name: "Bank Account",
        type: "bank",
        initialBalance: 5000,
        currencyId: usdCurrency._id!,
        minimumBalance: 100,
      },
      {
        $collection: Collection.WALLET,
        name: "Credit Card",
        type: "credit-card",
        initialBalance: -500,
        currencyId: usdCurrency._id!,
        minimumBalance: -2000,
      },
      {
        $collection: Collection.WALLET,
        name: "BDT Savings",
        type: "bank",
        initialBalance: 50000,
        currencyId: bdtCurrency._id!,
        minimumBalance: 1000,
      },
    ];

    const createdWallets: Wallet[] = [];
    for (const wallet of wallets) {
      const result = await pouchdbService.upsertDoc(wallet, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdWallet = { ...wallet, _id: result.id, _rev: result.rev };
      createdWallets.push(createdWallet);
    }

    return createdWallets;
  }

  /**
   * Setup demo parties and vendors
   */
  async setupDemoParties(): Promise<Party[]> {
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
        name: "Local Grocery Store",
        type: "vendor",
      },
      {
        $collection: Collection.PARTY,
        name: "Online Shopping Platform",
        type: "vendor",
      },
    ];

    const createdParties: Party[] = [];
    for (const party of parties) {
      const result = await pouchdbService.upsertDoc(party, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdParty = { ...party, _id: result.id, _rev: result.rev };
      createdParties.push(createdParty);
    }

    return createdParties;
  }

  /**
   * Setup demo assets
   */
  async setupDemoAssets(currencies: Currency[]): Promise<Asset[]> {
    const usdCurrency = currencies.find((c) => c.sign === "$");
    const bdtCurrency = currencies.find((c) => c.sign === "৳");

    if (!usdCurrency || !bdtCurrency) {
      throw new Error("Required currencies not found");
    }

    const assets: Asset[] = [
      {
        $collection: Collection.ASSET,
        name: "Stock Portfolio",
        type: "investment",
        liquidity: "high",
        initialBalance: 10000,
        currencyId: usdCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Real Estate Property",
        type: "property",
        liquidity: "low",
        initialBalance: 200000,
        currencyId: usdCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Gold Investment",
        type: "investment",
        liquidity: "moderate",
        initialBalance: 5000,
        currencyId: usdCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Fixed Deposit",
        type: "long-term-deposit",
        liquidity: "low",
        initialBalance: 25000,
        currencyId: bdtCurrency._id!,
      },
      {
        $collection: Collection.ASSET,
        name: "Mutual Fund",
        type: "investment",
        liquidity: "moderate",
        initialBalance: 15000,
        currencyId: usdCurrency._id!,
      },
    ];

    const createdAssets: Asset[] = [];
    for (const asset of assets) {
      const result = await pouchdbService.upsertDoc(asset, { isDemoData: true, demoCreatedAt: Date.now() });
      const createdAsset = { ...asset, _id: result.id, _rev: result.rev };
      createdAssets.push(createdAsset);
    }

    return createdAssets;
  }

  /**
   * Setup all demo data
   */
  async setupAllDemoData(): Promise<{
    currencies: Currency[];
    wallets: Wallet[];
    parties: Party[];
    assets: Asset[];
  }> {
    console.log("Starting demo data setup...");

    // Create currencies first
    console.log("Creating demo currencies...");
    const currencies = await this.setupDemoCurrencies();
    console.log(`Created ${currencies.length} currencies`);

    // Create wallets (depends on currencies)
    console.log("Creating demo wallets...");
    const wallets = await this.setupDemoWallets(currencies);
    console.log(`Created ${wallets.length} wallets`);

    // Create parties (independent)
    console.log("Creating demo parties...");
    const parties = await this.setupDemoParties();
    console.log(`Created ${parties.length} parties`);

    // Create assets (depends on currencies)
    console.log("Creating demo assets...");
    const assets = await this.setupDemoAssets(currencies);
    console.log(`Created ${assets.length} assets`);

    console.log("Demo data setup completed successfully!");

    return {
      currencies,
      wallets,
      parties,
      assets,
    };
  }

  /**
   * Clear all demo data
   */
  async clearAllDemoData(): Promise<void> {
    console.log("Starting demo data cleanup...");

    // Get all demo documents
    const collections = [Collection.CURRENCY, Collection.WALLET, Collection.PARTY, Collection.ASSET];

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
