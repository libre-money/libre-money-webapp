<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin" style="min-width: 100%; max-width: 90vw">
      <q-card-section>
        <div class="std-dialog-title" style="margin-bottom: 12px">
          Records for {{ budgetItem.name }}
          <q-chip v-if="budgetItem.type === 'Asset'" size="sm" color="blue" text-color="white" label="Asset" />
        </div>

        <loading-indicator :is-loading="isLoading" :phases="3" ref="loadingIndicator" />

        <div v-if="!isLoading && records.length > 0" class="records-container">
          <div class="q-mb-md">
            <div class="text-subtitle2">
              {{ records.length }} {{ records.length === 1 ? "record" : "records" }} found
              <span v-if="period" class="text-caption"> for period: {{ formatPeriodTitle(period) }} </span>
            </div>
          </div>

          <div class="records-list">
            <div v-for="(record, index) in records" :key="record._id" class="record-item">
              <template v-if="index === 0 || prettifyDate(records[index].transactionEpoch) !== prettifyDate(records[index - 1].transactionEpoch)">
                <div class="date-divider">
                  <div class="date-label">{{ prettifyDate(records[index].transactionEpoch) }}</div>
                </div>
              </template>

              <div class="record-row">
                <div class="record-details">
                  <div class="record-type">{{ record.typePrettified }}</div>
                  <div class="record-notes" v-if="record.notes">{{ record.notes }}</div>
                  <div class="record-party" v-if="getParty(record)">
                    <span class="party-type">{{ getParty(record)?.type }}</span
                    >: {{ getParty(record)?.name }}
                  </div>
                  <div class="record-wallet" v-if="getWallet(record)">Wallet: {{ getWallet(record)!.name }}</div>
                  <div class="record-tags" v-if="record.tagList && record.tagList.length > 0">
                    <q-chip
                      v-for="tag in record.tagList"
                      :key="tag._id"
                      size="sm"
                      :style="`background-color: ${tag.color}; color: ${guessFontColorCode(tag.color)}`"
                      :label="tag.name"
                    />
                  </div>
                </div>

                <div class="record-amount">
                  <div class="amount" :class="{ 'amount-out': isRecordOutFlow(record), 'amount-in': isRecordInFlow(record) }">
                    {{ printAmount(getNumber(record, "amount")!, getString(record, "currencyId")!) }}
                  </div>
                  <div class="unpaid-amount" v-if="getNumber(record, 'amountUnpaid')! > 0">
                    Unpaid: {{ printAmount(getNumber(record, "amountUnpaid")!, getString(record, "currencyId")!) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!isLoading && records.length === 0" class="text-center q-pa-lg">
          <q-icon name="receipt_long" size="64px" color="grey-5" />
          <p class="text-grey-6 q-mt-md">No records found for this budget item</p>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end" style="margin-right: 8px; margin-bottom: 8px">
        <q-btn color="primary" label="Close" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { BudgetAnalysisItem } from "src/services/budget-analysis-service";
import { BudgetedPeriod } from "src/models/rolling-budget";
import { Record } from "src/models/record";
import { Party } from "src/models/party";
import { Wallet } from "src/models/wallet";
import { Asset } from "src/models/asset";
import { recordService } from "src/services/record-service";
import { entityService } from "src/services/entity-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { Collection } from "src/constants/constants";
import { printAmount } from "src/utils/de-facto-utils";
import { prettifyDate } from "src/utils/misc-utils";
import { guessFontColorCode } from "src/utils/misc-utils";
import { Ref, onMounted, ref } from "vue";

// Extended Record type with enriched data
interface EnrichedRecord extends Record {
  typePrettified?: string;
  tagList?: any[];
  expense?: {
    expenseAvenueId: string;
    amount: number;
    currencyId: string;
    partyId: string | null;
    walletId: string;
    amountPaid: number;
    amountUnpaid: number;
    _currencySign?: string;
    _expenseAvenueName?: string;
    party?: Party;
    wallet?: Wallet;
    expenseAvenue?: any;
  };
  assetPurchase?: {
    assetId: string;
    amount: number;
    currencyId: string;
    partyId: string | null;
    walletId: string;
    amountPaid: number;
    amountUnpaid: number;
    party?: Party;
    wallet?: Wallet;
    asset?: Asset;
  };
}

const props = defineProps<{
  budgetItem: BudgetAnalysisItem;
  budget: any;
  period?: BudgetedPeriod | null;
}>();

const emit = defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const isLoading = ref(true);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();
const records: Ref<EnrichedRecord[]> = ref([]);

async function loadRecords() {
  isLoading.value = true;

  try {
    // Get all records first
    const allRecords = (await pouchdbService.listByCollection(Collection.RECORD)).docs as Record[];

    // Filter records for this specific budget item and period
    let filteredRecords = allRecords.filter((record) => {
      // If showing all records for a period
      if (props.budgetItem.id === "all") {
        return true; // Include all records, will be filtered by period
      }

      // Check if record matches the budget item type and ID
      if (props.budgetItem.type === "Expense" && record.expense) {
        return record.expense.expenseAvenueId === props.budgetItem.id;
      } else if (props.budgetItem.type === "Asset" && record.assetPurchase) {
        return record.assetPurchase.assetId === props.budgetItem.id;
      }
      return false;
    });

    // Filter by period if specified
    if (props.period) {
      filteredRecords = filteredRecords.filter(
        (record) => record.transactionEpoch >= props.period!.startEpoch && record.transactionEpoch <= props.period!.endEpoch
      );
    }

    // Sort by transaction date descending
    filteredRecords.sort((a, b) => b.transactionEpoch - a.transactionEpoch);

    // Enrich records with related entities
    const enrichedRecords: EnrichedRecord[] = [];
    for (const record of filteredRecords) {
      const enrichedRecord = await enrichRecord(record);
      enrichedRecords.push(enrichedRecord);
    }

    records.value = enrichedRecords;
  } catch (error) {
    console.error("Error loading records:", error);
  } finally {
    isLoading.value = false;
  }
}

async function enrichRecord(record: Record): Promise<EnrichedRecord> {
  const enrichedRecord = record as EnrichedRecord;

  // Add type prettified
  enrichedRecord.typePrettified = record.type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Add party if exists
  if (record.expense?.partyId) {
    enrichedRecord.expense!.party = await entityService.getParty(record.expense.partyId);
  }
  if (record.assetPurchase?.partyId) {
    enrichedRecord.assetPurchase!.party = await entityService.getParty(record.assetPurchase.partyId);
  }

  // Add wallet if exists
  if (record.expense?.walletId) {
    enrichedRecord.expense!.wallet = await entityService.getWallet(record.expense.walletId);
  }
  if (record.assetPurchase?.walletId) {
    enrichedRecord.assetPurchase!.wallet = await entityService.getWallet(record.assetPurchase.walletId);
  }

  // Add expense avenue if exists
  if (record.expense?.expenseAvenueId) {
    enrichedRecord.expense!.expenseAvenue = await entityService.getExpenseAvenue(record.expense.expenseAvenueId);
  }

  // Add asset if exists
  if (record.assetPurchase?.assetId) {
    enrichedRecord.assetPurchase!.asset = await entityService.getAsset(record.assetPurchase.assetId);
  }

  // Add tags
  enrichedRecord.tagList = await entityService.getTagList(record.tagIdList);

  return enrichedRecord;
}

function formatPeriodTitle(period: BudgetedPeriod | null): string {
  if (!period) return "";
  const startDate = prettifyDate(period.startEpoch);
  const endDate = prettifyDate(period.endEpoch);
  return `${startDate} - ${endDate}`;
}

function getParty(record: EnrichedRecord): Party | null {
  if (record.expense?.party) return record.expense.party;
  if (record.assetPurchase?.party) return record.assetPurchase.party;
  return null;
}

function getWallet(record: EnrichedRecord): Wallet | null {
  if (record.expense?.wallet) return record.expense.wallet;
  if (record.assetPurchase?.wallet) return record.assetPurchase.wallet;
  return null;
}

function getAsset(record: EnrichedRecord): Asset | null {
  if (record.assetPurchase?.asset) return record.assetPurchase.asset;
  return null;
}

function getNumber(record: EnrichedRecord, key: string): number | null {
  if (record.expense && record.expense[key as keyof typeof record.expense] !== undefined) {
    return record.expense[key as keyof typeof record.expense] as number;
  }
  if (record.assetPurchase && record.assetPurchase[key as keyof typeof record.assetPurchase] !== undefined) {
    return record.assetPurchase[key as keyof typeof record.assetPurchase] as number;
  }
  return null;
}

function getString(record: EnrichedRecord, key: string): string | null {
  if (record.expense && record.expense[key as keyof typeof record.expense] !== undefined) {
    return record.expense[key as keyof typeof record.expense] as string;
  }
  if (record.assetPurchase && record.assetPurchase[key as keyof typeof record.assetPurchase] !== undefined) {
    return record.assetPurchase[key as keyof typeof record.assetPurchase] as string;
  }
  return null;
}

function isRecordOutFlow(record: EnrichedRecord): boolean {
  return (
    record.type === "expense" ||
    record.type === "asset_purchase" ||
    record.type === "lending" ||
    record.type === "repayment_given" ||
    (record.type === "money_transfer" && record.moneyTransfer?.fromAmount !== undefined)
  );
}

function isRecordInFlow(record: EnrichedRecord): boolean {
  return (
    record.type === "income" ||
    record.type === "asset_sale" ||
    record.type === "borrowing" ||
    record.type === "repayment_received" ||
    (record.type === "money_transfer" && record.moneyTransfer?.toAmount !== undefined)
  );
}

async function okClicked() {
  onDialogOK();
}

onMounted(() => {
  loadRecords();
});
</script>

<style scoped lang="scss">
.records-container {
  max-height: 60vh;
  overflow-y: auto;
}

.records-list {
  .record-item {
    margin-bottom: 8px;
  }

  .date-divider {
    margin: 16px 0 8px 0;
    border-bottom: 1px solid #e0e0e0;

    .date-label {
      font-weight: 500;
      color: #666;
      font-size: 14px;
      padding: 4px 0;
    }
  }

  .record-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fafafa;

    .record-details {
      flex: 1;

      .record-type {
        font-weight: 500;
        color: #1976d2;
        margin-bottom: 4px;
      }

      .record-notes {
        color: #666;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .record-party {
        font-size: 14px;
        margin-bottom: 4px;

        .party-type {
          font-weight: 500;
          color: #666;
        }
      }

      .record-wallet {
        font-size: 14px;
        color: #666;
        margin-bottom: 4px;
      }

      .record-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
      }
    }

    .record-amount {
      text-align: right;
      min-width: 120px;

      .amount {
        font-weight: 600;
        font-size: 16px;

        &.amount-out {
          color: #d32f2f;
        }

        &.amount-in {
          color: #388e3c;
        }
      }

      .unpaid-amount {
        font-size: 12px;
        color: #f57c00;
        margin-top: 2px;
      }
    }
  }
}

@media (max-width: 768px) {
  .record-row {
    flex-direction: column;

    .record-amount {
      text-align: left;
      margin-top: 8px;
    }
  }
}
</style>
