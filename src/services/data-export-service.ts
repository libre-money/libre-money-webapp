import { Collection, RecordType } from "src/constants/constants";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { Asset } from "src/schemas/asset";
import { Currency } from "src/schemas/currency";
import { ExpenseAvenue } from "src/schemas/expense-avenue";
import { IncomeSource } from "src/schemas/income-source";
import { Party } from "src/schemas/party";
import { Tag } from "src/schemas/tag";
import { Wallet } from "src/schemas/wallet";
import { pouchdbService } from "src/services/pouchdb-service";
import { recordService } from "src/services/record-service";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatDateForCsv(epoch?: number): string {
  if (!epoch || epoch <= 0) return "";
  try {
    return new Date(epoch).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function supportsParty(recordType: string): boolean {
  return [
    RecordType.EXPENSE,
    RecordType.INCOME,
    RecordType.LENDING,
    RecordType.BORROWING,
    RecordType.REPAYMENT_GIVEN,
    RecordType.REPAYMENT_RECEIVED,
    RecordType.ASSET_PURCHASE,
    RecordType.ASSET_SALE,
  ].includes(recordType as any);
}

function getRecordAmount(record: InferredRecord): number {
  if ((record as any).expense) return (record as any).expense.amount;
  if ((record as any).income) return (record as any).income.amount;
  if ((record as any).lending) return (record as any).lending.amount;
  if ((record as any).borrowing) return (record as any).borrowing.amount;
  if ((record as any).repaymentGiven) return (record as any).repaymentGiven.amount;
  if ((record as any).repaymentReceived) return (record as any).repaymentReceived.amount;
  if ((record as any).assetPurchase) return (record as any).assetPurchase.amount;
  if ((record as any).assetSale) return (record as any).assetSale.amount;
  if ((record as any).assetAppreciationDepreciation) return (record as any).assetAppreciationDepreciation.amount;
  return 0;
}

function getRecordCurrencyId(record: InferredRecord): string {
  if ((record as any).expense) return (record as any).expense.currencyId;
  if ((record as any).income) return (record as any).income.currencyId;
  if ((record as any).lending) return (record as any).lending.currencyId;
  if ((record as any).borrowing) return (record as any).borrowing.currencyId;
  if ((record as any).repaymentGiven) return (record as any).repaymentGiven.currencyId;
  if ((record as any).repaymentReceived) return (record as any).repaymentReceived.currencyId;
  if ((record as any).assetPurchase) return (record as any).assetPurchase.currencyId;
  if ((record as any).assetSale) return (record as any).assetSale.currencyId;
  if ((record as any).assetAppreciationDepreciation) return (record as any).assetAppreciationDepreciation.currencyId;
  return "";
}

function getRecordWalletId(record: InferredRecord): string {
  if ((record as any).expense) return (record as any).expense.walletId;
  if ((record as any).income) return (record as any).income.walletId || "";
  if ((record as any).lending) return (record as any).lending.walletId;
  if ((record as any).borrowing) return (record as any).borrowing.walletId;
  if ((record as any).repaymentGiven) return (record as any).repaymentGiven.walletId;
  if ((record as any).repaymentReceived) return (record as any).repaymentReceived.walletId;
  if ((record as any).assetPurchase) return (record as any).assetPurchase.walletId;
  if ((record as any).assetSale) return (record as any).assetSale.walletId;
  return "";
}

function getAvenueSourceAssetName(
  record: InferredRecord,
  expenseAvenues: ExpenseAvenue[],
  incomeSources: IncomeSource[],
  assets: Asset[]
): string {
  if (record.type === "expense") {
    const id = (record as any).expense?.expenseAvenueId;
    return expenseAvenues.find((x) => x._id === id)?.name || "";
  }
  if (record.type === "income") {
    const id = (record as any).income?.incomeSourceId;
    return incomeSources.find((x) => x._id === id)?.name || "";
  }
  if (
    record.type === "asset-purchase" ||
    record.type === "asset-sale" ||
    record.type === "asset-appreciation-depreciation"
  ) {
    const id =
      (record as any).assetPurchase?.assetId ||
      (record as any).assetSale?.assetId ||
      (record as any).assetAppreciationDepreciation?.assetId;
    return assets.find((x) => x._id === id)?.name || "";
  }
  return "";
}

function getPartyName(record: InferredRecord, parties: Party[]): string {
  if (!supportsParty(record.type)) return "";
  const partyId =
    (record as any).expense?.partyId ||
    (record as any).income?.partyId ||
    (record as any).lending?.partyId ||
    (record as any).borrowing?.partyId ||
    (record as any).repaymentGiven?.partyId ||
    (record as any).repaymentReceived?.partyId ||
    (record as any).assetPurchase?.partyId ||
    (record as any).assetSale?.partyId;
  return parties.find((p) => p._id === partyId)?.name || "";
}

export const dataExportService = {
  async initiateTextFileDownload(options: { content: string; fileName: string; mimeType: string }) {
    const blob = new Blob([options.content], { type: options.mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = options.fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      const windowUrl = window.URL || window.webkitURL;
      windowUrl.revokeObjectURL(url);
    }, 100);
  },

  async exportRecordsToCsv(): Promise<string> {
    const [
      currencyDocs,
      walletDocs,
      expenseAvenueDocs,
      incomeSourceDocs,
      partyDocs,
      tagDocs,
      assetDocs,
      recordDocs,
    ] = await Promise.all([
      pouchdbService.listByCollection(Collection.CURRENCY),
      pouchdbService.listByCollection(Collection.WALLET),
      pouchdbService.listByCollection(Collection.EXPENSE_AVENUE),
      pouchdbService.listByCollection(Collection.INCOME_SOURCE),
      pouchdbService.listByCollection(Collection.PARTY),
      pouchdbService.listByCollection(Collection.TAG),
      pouchdbService.listByCollection(Collection.ASSET),
      pouchdbService.listByCollection(Collection.RECORD),
    ]);

    const currencies = currencyDocs.docs as Currency[];
    const wallets = walletDocs.docs as Wallet[];
    const expenseAvenues = expenseAvenueDocs.docs as ExpenseAvenue[];
    const incomeSources = incomeSourceDocs.docs as IncomeSource[];
    const parties = partyDocs.docs as Party[];
    const tags = tagDocs.docs as Tag[];
    const assets = assetDocs.docs as Asset[];

    const rawRecords = recordDocs.docs as any[];
    rawRecords.sort((a, b) => (b.transactionEpoch || 0) - (a.transactionEpoch || 0));

    const inferred = await recordService.inferInBatch(rawRecords as any);

    const headers = [
      "Date",
      "Type",
      "Amount",
      "Currency",
      "Wallet",
      "From Amount",
      "From Currency",
      "From Wallet",
      "To Amount",
      "To Currency",
      "To Wallet",
      "Avenue/Source/Asset",
      "Party",
      "Notes",
      "Tags",
      "Record ID",
    ];

    const tagNameById = new Map<string, string>();
    tags.forEach((t) => {
      if (t._id) tagNameById.set(t._id, t.name || "");
    });

    const currencyNameById = new Map<string, string>();
    currencies.forEach((c) => {
      if (c._id) currencyNameById.set(c._id, `${c.sign || ""} ${c.name || ""}`.trim());
    });

    const walletNameById = new Map<string, string>();
    wallets.forEach((w) => {
      if (w._id) walletNameById.set(w._id, w.name || "");
    });

    const lines: string[] = [];
    lines.push(headers.map(csvEscape).join(","));

    for (const r of inferred as InferredRecord[]) {
      const isMoneyTransfer = r.type === "money-transfer";

      const amount = isMoneyTransfer
        ? `from: ${(r as any).moneyTransfer?.fromAmount ?? 0}; to: ${(r as any).moneyTransfer?.toAmount ?? 0}`
        : getRecordAmount(r);

      const currency = isMoneyTransfer
        ? `from: ${currencyNameById.get((r as any).moneyTransfer?.fromCurrencyId || "") || ""}; to: ${
            currencyNameById.get((r as any).moneyTransfer?.toCurrencyId || "") || ""
          }`
        : currencyNameById.get(getRecordCurrencyId(r)) || "";

      const wallet = isMoneyTransfer
        ? `from: ${walletNameById.get((r as any).moneyTransfer?.fromWalletId || "") || ""}; to: ${
            walletNameById.get((r as any).moneyTransfer?.toWalletId || "") || ""
          }`
        : walletNameById.get(getRecordWalletId(r)) || "";

      const avenueSourceAsset = getAvenueSourceAssetName(r, expenseAvenues, incomeSources, assets);
      const party = getPartyName(r, parties);
      const notes = (r as any).notes || "";
      const tagIds = Array.isArray((r as any).tagIdList) ? ((r as any).tagIdList as string[]) : [];
      const tagNames = tagIds.map((id) => tagNameById.get(id) || id).filter(Boolean).join("; ");

      const row = [
        formatDateForCsv((r as any).transactionEpoch),
        r.type || "",
        amount,
        currency,
        wallet,
        isMoneyTransfer ? (r as any).moneyTransfer?.fromAmount ?? "" : "",
        isMoneyTransfer ? currencyNameById.get((r as any).moneyTransfer?.fromCurrencyId || "") || "" : "",
        isMoneyTransfer ? walletNameById.get((r as any).moneyTransfer?.fromWalletId || "") || "" : "",
        isMoneyTransfer ? (r as any).moneyTransfer?.toAmount ?? "" : "",
        isMoneyTransfer ? currencyNameById.get((r as any).moneyTransfer?.toCurrencyId || "") || "" : "",
        isMoneyTransfer ? walletNameById.get((r as any).moneyTransfer?.toWalletId || "") || "" : "",
        avenueSourceAsset,
        party,
        notes,
        tagNames,
        (r as any)._id || "",
      ];

      lines.push(row.map(csvEscape).join(","));
    }

    return lines.join("\n");
  },

  async downloadRecordsCsv(): Promise<void> {
    const csv = await dataExportService.exportRecordsToCsv();
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const hh = String(now.getUTCHours()).padStart(2, "0");
    const mi = String(now.getUTCMinutes()).padStart(2, "0");
    const ss = String(now.getUTCSeconds()).padStart(2, "0");
    const fileName = `libre money records ${yyyy}-${mm}-${dd} ${hh}-${mi}-${ss}.csv`;

    await dataExportService.initiateTextFileDownload({
      content: csv,
      fileName,
      mimeType: "text/csv;charset=utf-8",
    });
  },
};

