<template>
  <q-page class="column items-center justify-evenly">
    <!-- Desktop Only Notice -->
    <q-card class="std-card desktop-only-notice" v-if="!$q.screen.gt.sm">
      <div class="q-pa-lg text-center">
        <q-icon name="desktop_windows" size="64px" color="orange" />
        <div class="text-h6 q-mt-md">Desktop Only Feature</div>
        <div class="q-mt-sm text-grey-7">
          Pro Mode is designed for desktop use and requires a larger screen. Please switch to a desktop or tablet device to access this feature.
        </div>
      </div>
    </q-card>

    <!-- Pro Mode Content -->
    <div v-else class="pro-mode-container">
      <!-- Header Controls -->
      <q-card class="std-card pro-mode-header-card">
        <div class="title-row q-pa-md q-gutter-sm">
          <q-icon name="grid_view" size="24px" color="primary" />
          <div class="title">Pro Mode</div>
          <div class="spacer"></div>
          <q-btn color="secondary" icon="refresh" :label="hasUnsavedChanges ? 'Discard Changes' : 'Reload'" @click="loadData" :disable="isLoading" />
          <q-btn color="positive" icon="save" label="Save Changes" @click="saveAllChanges" :disable="!hasUnsavedChanges" :loading="isSaving" />
          <q-chip v-if="hasUnsavedChanges" color="orange" text-color="white" icon="edit">
            {{ changedRecords.size }} edit{{ changedRecords.size !== 1 ? "s" : ""
            }}{{ deletedRecords.size > 0 ? ", " + deletedRecords.size + " deletion" + (deletedRecords.size !== 1 ? "s" : "") : "" }}
          </q-chip>
        </div>
      </q-card>

      <!-- Spreadsheet -->
      <q-card class="std-card pro-mode-table-card">
        <div class="q-pa-md">
          <loading-indicator :is-loading="isLoading" :phases="3" ref="loadingIndicator"></loading-indicator>

          <div v-if="!isLoading" class="pro-mode-table-container">
            <table class="pro-mode-table">
              <thead>
                <tr>
                  <th class="row-status-col">Status</th>
                  <th class="date-col">Date</th>
                  <th class="type-col">Type</th>
                  <th class="amount-col">Amount</th>
                  <th class="currency-col">Currency</th>
                  <th class="wallet-col">Wallet</th>
                  <th class="avenue-source-col">Avenue/Source</th>
                  <th class="party-col">Party</th>
                  <th class="notes-col">Notes</th>
                  <th class="tags-col">Tags</th>
                  <th class="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(record, index) in records"
                  :key="record._id"
                  :class="{
                    'row-changed': isRowChanged(record._id!),
                    'row-deleted': isRowDeleted(record._id!),
                    'row-even': index % 2 === 0,
                    'row-odd': index % 2 === 1,
                  }"
                >
                  <!-- Status Column -->
                  <td class="row-status-col">
                    <q-icon v-if="isRowDeleted(record._id!)" name="delete" color="red" size="16px" title="Row marked for deletion" />
                    <q-icon v-else-if="isRowChanged(record._id!)" name="edit" color="orange" size="16px" title="Row has unsaved changes" />
                  </td>

                  <!-- Date Column -->
                  <td class="date-col">
                    <input
                      type="date"
                      :value="formatDateForInput(record.transactionEpoch)"
                      @input="updateField(record._id!, 'transactionEpoch', ($event.target as HTMLInputElement).value)"
                      class="cell-input date-input"
                    />
                  </td>

                  <!-- Type Column -->
                  <td class="type-col">
                    <select
                      :value="record.type"
                      @change="updateField(record._id!, 'type', ($event.target as HTMLSelectElement).value)"
                      class="cell-input select-input"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                      <option value="money-transfer">Money Transfer</option>
                      <option value="asset-purchase">Asset Purchase</option>
                      <option value="asset-sale">Asset Sale</option>
                      <option value="lending">Lending</option>
                      <option value="borrowing">Borrowing</option>
                      <option value="repayment-given">Repayment Given</option>
                      <option value="repayment-received">Repayment Received</option>
                    </select>
                  </td>

                  <!-- Amount Column -->
                  <td class="amount-col">
                    <input
                      type="number"
                      step="0.01"
                      :value="getRecordAmount(record)"
                      @input="updateRecordAmount(record._id!, ($event.target as HTMLInputElement).value)"
                      class="cell-input number-input"
                    />
                  </td>

                  <!-- Currency Column -->
                  <td class="currency-col">
                    <select
                      :value="getRecordCurrency(record)"
                      @change="updateRecordCurrency(record._id!, ($event.target as HTMLSelectElement).value)"
                      class="cell-input select-input"
                    >
                      <option v-for="currency in currencies" :key="currency._id" :value="currency._id">{{ currency.sign }} {{ currency.name }}</option>
                    </select>
                  </td>

                  <!-- Wallet Column -->
                  <td class="wallet-col">
                    <select
                      :value="getRecordWallet(record)"
                      @change="updateRecordWallet(record._id!, ($event.target as HTMLSelectElement).value)"
                      class="cell-input select-input"
                    >
                      <option v-for="wallet in wallets" :key="wallet._id" :value="wallet._id">
                        {{ wallet.name }}
                      </option>
                    </select>
                  </td>

                  <!-- Avenue/Source Column -->
                  <td class="avenue-source-col">
                    <select
                      v-if="record.type === 'expense'"
                      :value="record.expense?.expenseAvenueId"
                      @change="updateNestedField(record._id!, 'expense', 'expenseAvenueId', ($event.target as HTMLSelectElement).value)"
                      class="cell-input select-input"
                    >
                      <option v-for="avenue in expenseAvenues" :key="avenue._id" :value="avenue._id">
                        {{ avenue.name }}
                      </option>
                    </select>
                    <select
                      v-else-if="record.type === 'income'"
                      :value="record.income?.incomeSourceId"
                      @change="updateNestedField(record._id!, 'income', 'incomeSourceId', ($event.target as HTMLSelectElement).value)"
                      class="cell-input select-input"
                    >
                      <option v-for="source in incomeSources" :key="source._id" :value="source._id">
                        {{ source.name }}
                      </option>
                    </select>
                    <span v-else class="text-grey-6">-</span>
                  </td>

                  <!-- Party Column -->
                  <td class="party-col">
                    <select
                      v-if="supportsParty(record.type)"
                      :value="getRecordParty(record)"
                      @change="updateRecordParty(record._id!, ($event.target as HTMLSelectElement).value)"
                      class="cell-input select-input"
                    >
                      <option value="">No Party</option>
                      <option v-for="party in parties" :key="party._id" :value="party._id">
                        {{ party.name }}
                      </option>
                    </select>
                    <span v-else class="text-grey-6">-</span>
                  </td>

                  <!-- Notes Column -->
                  <td class="notes-col">
                    <div
                      :contenteditable="true"
                      @input="updateField(record._id!, 'notes', ($event.target as HTMLElement).textContent)"
                      @blur="updateField(record._id!, 'notes', ($event.target as HTMLElement).textContent)"
                      class="cell-input contenteditable-input"
                      :data-placeholder="record.notes || 'Add notes...'"
                    >
                      {{ record.notes }}
                    </div>
                  </td>

                  <!-- Tags Column -->
                  <td class="tags-col">
                    <div class="tags-container">
                      <span
                        v-for="tagId in record.tagIdList"
                        :key="tagId"
                        class="tag-chip"
                        :style="getTagStyle(tagId)"
                        @click="removeTag(record._id!, tagId)"
                        title="Click to remove"
                      >
                        {{ getTagName(tagId) }}
                      </span>
                      <select
                        @change="
                          addTag(record._id!, ($event.target as HTMLSelectElement).value);
                          ($event.target as HTMLSelectElement).value = '';
                        "
                        class="add-tag-select"
                      >
                        <option value="">+ Add Tag</option>
                        <option v-for="tag in availableTags(record.tagIdList)" :key="tag._id" :value="tag._id">
                          {{ tag.name }}
                        </option>
                      </select>
                    </div>
                  </td>

                  <!-- Actions Column -->
                  <td class="actions-col">
                    <button v-if="isRowDeleted(record._id!)" @click="unmarkForDeletion(record._id!)" class="action-btn restore-btn" title="Restore record">
                      <q-icon name="restore" size="14px" />
                    </button>
                    <template v-else>
                      <button @click="revertRecord(record._id!)" :disabled="!isRowChanged(record._id!)" class="action-btn revert-btn" title="Revert changes">
                        <q-icon name="undo" size="14px" />
                      </button>
                      <button @click="markForDeletion(record._id!)" class="action-btn delete-btn" title="Mark for deletion">
                        <q-icon name="delete" size="14px" />
                      </button>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { Collection, RecordType } from "src/constants/constants";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { Record } from "src/models/record";
import { Currency } from "src/models/currency";
import { Wallet } from "src/models/wallet";
import { ExpenseAvenue } from "src/models/expense-avenue";
import { IncomeSource } from "src/models/income-source";
import { Party } from "src/models/party";
import { Tag } from "src/models/tag";
import { pouchdbService } from "src/services/pouchdb-service";
import { recordService } from "src/services/record-service";
import { dialogService } from "src/services/dialog-service";
import { guessFontColorCode, deepClone, sleep } from "src/utils/misc-utils";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { Ref, onMounted, ref, computed } from "vue";

const $q = useQuasar();

// ----- Refs
const isLoading = ref(false);
const isSaving = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const records: Ref<InferredRecord[]> = ref([]);
const originalRecords: Ref<Map<string, InferredRecord>> = ref(new Map());
const changedRecords: Ref<Map<string, InferredRecord>> = ref(new Map());
const deletedRecords: Ref<Set<string>> = ref(new Set<string>());

// Reference data
const currencies: Ref<Currency[]> = ref([]);
const wallets: Ref<Wallet[]> = ref([]);
const expenseAvenues: Ref<ExpenseAvenue[]> = ref([]);
const incomeSources: Ref<IncomeSource[]> = ref([]);
const parties: Ref<Party[]> = ref([]);
const tags: Ref<Tag[]> = ref([]);

// ----- Computed
const hasUnsavedChanges = computed(() => changedRecords.value.size > 0 || deletedRecords.value.size > 0);

// ----- Functions
async function loadData() {
  isLoading.value = true;

  try {
    loadingIndicator.value?.startPhase({ phase: 1, weight: 20, label: "Loading reference data" });

    // Load reference data
    const [currencyDocs, walletDocs, expenseAvenueDocs, incomeSourceDocs, partyDocs, tagDocs] = await Promise.all([
      pouchdbService.listByCollection(Collection.CURRENCY),
      pouchdbService.listByCollection(Collection.WALLET),
      pouchdbService.listByCollection(Collection.EXPENSE_AVENUE),
      pouchdbService.listByCollection(Collection.INCOME_SOURCE),
      pouchdbService.listByCollection(Collection.PARTY),
      pouchdbService.listByCollection(Collection.TAG),
    ]);

    await sleep(10);

    currencies.value = currencyDocs.docs as Currency[];
    wallets.value = walletDocs.docs as Wallet[];
    expenseAvenues.value = expenseAvenueDocs.docs as ExpenseAvenue[];
    incomeSources.value = incomeSourceDocs.docs as IncomeSource[];
    parties.value = partyDocs.docs as Party[];
    tags.value = tagDocs.docs as Tag[];

    loadingIndicator.value?.startPhase({ phase: 2, weight: 25, label: "Loading records" });

    // Load records
    const recordDocs = await pouchdbService.listByCollection(Collection.RECORD);
    const rawRecords = (recordDocs.docs as Record[]).slice(0, 100);

    await sleep(10);

    // Sort by transaction date (newest first)
    rawRecords.sort((a, b) => (b.transactionEpoch || 0) - (a.transactionEpoch || 0));

    loadingIndicator.value?.startPhase({ phase: 3, weight: 30, label: "Processing records" });

    // Convert to inferred records
    const inferredRecords = await recordService.inferInBatch(rawRecords);

    loadingIndicator.value?.startPhase({ phase: 3, weight: 15, label: "Re-inferring records" });

    records.value = inferredRecords;

    // Store original copies for change tracking
    originalRecords.value.clear();
    changedRecords.value.clear();
    deletedRecords.value.clear();

    loadingIndicator.value?.startPhase({ phase: 4, weight: 10, label: "Finalizing records" });

    inferredRecords.forEach((record) => {
      if (record._id) {
        originalRecords.value.set(record._id, deepClone(record));
      }
    });
  } catch (error) {
    console.error("Error loading data:", error);
    await dialogService.alert("Error", "Failed to load data for Pro Mode.");
  } finally {
    isLoading.value = false;
  }
}

// ----- Field Update Functions
function updateField(recordId: string, field: string, value: any) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  if (field === "transactionEpoch" && typeof value === "string") {
    value = new Date(value).getTime();
  }

  (record as any)[field] = value;

  markRecordChanged(recordId);
}

function updateNestedField(recordId: string, parentField: string, field: string, value: any) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  const recordAny = record as any;
  if (!recordAny[parentField]) {
    recordAny[parentField] = {};
  }

  recordAny[parentField][field] = value;

  markRecordChanged(recordId);
}

function updateRecordAmount(recordId: string, value: string) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  const amount = parseFloat(value) || 0;

  // Update amount based on record type
  if (record.expense) {
    record.expense.amount = amount;
    record.expense.amountPaid = amount; // Default to fully paid
  } else if (record.income) {
    record.income.amount = amount;
    record.income.amountPaid = amount;
  } else if (record.lending) {
    record.lending.amount = amount;
  } else if (record.borrowing) {
    record.borrowing.amount = amount;
  } else if (record.repaymentGiven) {
    record.repaymentGiven.amount = amount;
  } else if (record.repaymentReceived) {
    record.repaymentReceived.amount = amount;
  } else if (record.assetPurchase) {
    record.assetPurchase.amount = amount;
    record.assetPurchase.amountPaid = amount;
  } else if (record.assetSale) {
    record.assetSale.amount = amount;
    record.assetSale.amountPaid = amount;
  } else if (record.assetAppreciationDepreciation) {
    record.assetAppreciationDepreciation.amount = amount;
  }

  markRecordChanged(recordId);
}

function updateRecordCurrency(recordId: string, currencyId: string) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  // Update currency based on record type
  if (record.expense) {
    record.expense.currencyId = currencyId;
  } else if (record.income) {
    record.income.currencyId = currencyId;
  } else if (record.lending) {
    record.lending.currencyId = currencyId;
  } else if (record.borrowing) {
    record.borrowing.currencyId = currencyId;
  } else if (record.repaymentGiven) {
    record.repaymentGiven.currencyId = currencyId;
  } else if (record.repaymentReceived) {
    record.repaymentReceived.currencyId = currencyId;
  } else if (record.assetPurchase) {
    record.assetPurchase.currencyId = currencyId;
  } else if (record.assetSale) {
    record.assetSale.currencyId = currencyId;
  } else if (record.assetAppreciationDepreciation) {
    record.assetAppreciationDepreciation.currencyId = currencyId;
  }

  markRecordChanged(recordId);
}

function updateRecordWallet(recordId: string, walletId: string) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  // Update wallet based on record type
  if (record.expense) {
    record.expense.walletId = walletId;
  } else if (record.income && record.income.walletId !== undefined) {
    record.income.walletId = walletId;
  } else if (record.lending) {
    record.lending.walletId = walletId;
  } else if (record.borrowing) {
    record.borrowing.walletId = walletId;
  } else if (record.repaymentGiven) {
    record.repaymentGiven.walletId = walletId;
  } else if (record.repaymentReceived) {
    record.repaymentReceived.walletId = walletId;
  } else if (record.assetPurchase) {
    record.assetPurchase.walletId = walletId;
  } else if (record.assetSale) {
    record.assetSale.walletId = walletId;
  }

  markRecordChanged(recordId);
}

function updateRecordParty(recordId: string, partyId: string | null) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  const finalPartyId = partyId === "" ? null : partyId;

  // Update party based on record type
  if (record.expense) {
    record.expense.partyId = finalPartyId;
  } else if (record.income) {
    record.income.partyId = finalPartyId;
  } else if (record.lending) {
    record.lending.partyId = finalPartyId || "";
  } else if (record.borrowing) {
    record.borrowing.partyId = finalPartyId || "";
  } else if (record.repaymentGiven) {
    record.repaymentGiven.partyId = finalPartyId || "";
  } else if (record.repaymentReceived) {
    record.repaymentReceived.partyId = finalPartyId || "";
  } else if (record.assetPurchase) {
    record.assetPurchase.partyId = finalPartyId;
  } else if (record.assetSale) {
    record.assetSale.partyId = finalPartyId;
  }

  markRecordChanged(recordId);
}

// ----- Helper Functions
function getRecordAmount(record: InferredRecord): number {
  if (record.expense) return record.expense.amount;
  if (record.income) return record.income.amount;
  if (record.lending) return record.lending.amount;
  if (record.borrowing) return record.borrowing.amount;
  if (record.repaymentGiven) return record.repaymentGiven.amount;
  if (record.repaymentReceived) return record.repaymentReceived.amount;
  if (record.assetPurchase) return record.assetPurchase.amount;
  if (record.assetSale) return record.assetSale.amount;
  if (record.assetAppreciationDepreciation) return record.assetAppreciationDepreciation.amount;
  return 0;
}

function getRecordCurrency(record: InferredRecord): string {
  if (record.expense) return record.expense.currencyId;
  if (record.income) return record.income.currencyId;
  if (record.lending) return record.lending.currencyId;
  if (record.borrowing) return record.borrowing.currencyId;
  if (record.repaymentGiven) return record.repaymentGiven.currencyId;
  if (record.repaymentReceived) return record.repaymentReceived.currencyId;
  if (record.assetPurchase) return record.assetPurchase.currencyId;
  if (record.assetSale) return record.assetSale.currencyId;
  if (record.assetAppreciationDepreciation) return record.assetAppreciationDepreciation.currencyId;
  return "";
}

function getRecordWallet(record: InferredRecord): string {
  if (record.expense) return record.expense.walletId;
  if (record.income) return record.income.walletId || "";
  if (record.lending) return record.lending.walletId;
  if (record.borrowing) return record.borrowing.walletId;
  if (record.repaymentGiven) return record.repaymentGiven.walletId;
  if (record.repaymentReceived) return record.repaymentReceived.walletId;
  if (record.assetPurchase) return record.assetPurchase.walletId;
  if (record.assetSale) return record.assetSale.walletId;
  return "";
}

function getRecordParty(record: InferredRecord): string {
  if (record.expense) return record.expense.partyId || "";
  if (record.income) return record.income.partyId || "";
  if (record.lending) return record.lending.partyId || "";
  if (record.borrowing) return record.borrowing.partyId || "";
  if (record.repaymentGiven) return record.repaymentGiven.partyId || "";
  if (record.repaymentReceived) return record.repaymentReceived.partyId || "";
  if (record.assetPurchase) return record.assetPurchase.partyId || "";
  if (record.assetSale) return record.assetSale.partyId || "";
  return "";
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
  ].includes(recordType);
}

function formatDateForInput(epoch: number): string {
  const date = new Date(epoch);
  return date.toISOString().split("T")[0];
}

function getTagName(tagId: string): string {
  const tag = tags.value.find((t) => t._id === tagId);
  return tag?.name || "Unknown Tag";
}

function getTagStyle(tagId: string) {
  const tag = tags.value.find((t) => t._id === tagId);
  if (!tag) return {};

  return {
    backgroundColor: tag.color,
    color: guessFontColorCode(tag.color),
  };
}

function availableTags(currentTagIds: string[]): Tag[] {
  return tags.value.filter((tag) => !currentTagIds.includes(tag._id || ""));
}

function addTag(recordId: string, tagId: string) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record || !tagId) return;

  if (!record.tagIdList.includes(tagId)) {
    record.tagIdList.push(tagId);
    markRecordChanged(recordId);
  }
}

function removeTag(recordId: string, tagId: string) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  const index = record.tagIdList.indexOf(tagId);
  if (index > -1) {
    record.tagIdList.splice(index, 1);
    markRecordChanged(recordId);
  }
}

// ----- Change Tracking
function markRecordChanged(recordId: string) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  // Don't track changes for records marked for deletion
  if (deletedRecords.value.has(recordId)) return;

  changedRecords.value.set(recordId, deepClone(record));
}

function isRowChanged(recordId: string): boolean {
  return changedRecords.value.has(recordId);
}

function isRowDeleted(recordId: string): boolean {
  return deletedRecords.value.has(recordId);
}

function revertRecord(recordId: string) {
  const original = originalRecords.value.get(recordId);
  if (!original) return;

  const index = records.value.findIndex((r) => r._id === recordId);
  if (index > -1) {
    records.value[index] = deepClone(original);
  }

  changedRecords.value.delete(recordId);
}

function markForDeletion(recordId: string) {
  deletedRecords.value.add(recordId);
  // Remove from changed records since deletion takes precedence
  changedRecords.value.delete(recordId);
}

function unmarkForDeletion(recordId: string) {
  deletedRecords.value.delete(recordId);
}

// ----- Save Functions
async function saveAllChanges() {
  if (!hasUnsavedChanges.value) return;

  isSaving.value = true;

  try {
    const recordsToSave = Array.from(changedRecords.value.values());
    const recordsToDelete = Array.from(deletedRecords.value);

    // Save updated records
    for (const record of recordsToSave) {
      // Strip the inference data before saving
      const cleanRecord = stripInferenceData(record);
      await pouchdbService.upsertDoc(cleanRecord);
    }

    // Delete marked records
    for (const recordId of recordsToDelete) {
      const record = records.value.find((r) => r._id === recordId);
      if (record) {
        await pouchdbService.removeDoc(record);
      }
    }

    // Remove deleted records from local state
    records.value = records.value.filter((record) => !deletedRecords.value.has(record._id || ""));

    // Clear change tracking
    changedRecords.value.clear();
    deletedRecords.value.clear();

    // Update original records for remaining records
    originalRecords.value.clear();
    records.value.forEach((record) => {
      if (record._id) {
        originalRecords.value.set(record._id, deepClone(record));
      }
    });

    let message = "";
    if (recordsToSave.length > 0 && recordsToDelete.length > 0) {
      message = `Successfully saved ${recordsToSave.length} record(s) and deleted ${recordsToDelete.length} record(s)`;
    } else if (recordsToSave.length > 0) {
      message = `Successfully saved ${recordsToSave.length} record(s)`;
    } else if (recordsToDelete.length > 0) {
      message = `Successfully deleted ${recordsToDelete.length} record(s)`;
    }

    $q.notify({
      type: "positive",
      message,
      position: "top",
    });
  } catch (error) {
    console.error("Error saving records:", error);
    await dialogService.alert("Error", "Failed to save some records. Please try again.");
  } finally {
    isSaving.value = false;
  }
}

function stripInferenceData(inferredRecord: InferredRecord): Record {
  const cleanRecord = deepClone(inferredRecord) as any;

  // Remove inferred data but keep the raw data
  if (cleanRecord.expense) {
    delete cleanRecord.expense.expenseAvenue;
    delete cleanRecord.expense.party;
    delete cleanRecord.expense.wallet;
  }
  if (cleanRecord.income) {
    delete cleanRecord.income.incomeSource;
    delete cleanRecord.income.party;
    delete cleanRecord.income.wallet;
  }
  if (cleanRecord.moneyTransfer) {
    delete cleanRecord.moneyTransfer.fromWallet;
    delete cleanRecord.moneyTransfer.toWallet;
  }
  if (cleanRecord.lending) {
    delete cleanRecord.lending.party;
    delete cleanRecord.lending.wallet;
  }
  if (cleanRecord.borrowing) {
    delete cleanRecord.borrowing.party;
    delete cleanRecord.borrowing.wallet;
  }
  if (cleanRecord.repaymentGiven) {
    delete cleanRecord.repaymentGiven.party;
    delete cleanRecord.repaymentGiven.wallet;
  }
  if (cleanRecord.repaymentReceived) {
    delete cleanRecord.repaymentReceived.party;
    delete cleanRecord.repaymentReceived.wallet;
  }
  if (cleanRecord.assetPurchase) {
    delete cleanRecord.assetPurchase.asset;
    delete cleanRecord.assetPurchase.party;
    delete cleanRecord.assetPurchase.wallet;
  }
  if (cleanRecord.assetSale) {
    delete cleanRecord.assetSale.asset;
    delete cleanRecord.assetSale.party;
    delete cleanRecord.assetSale.wallet;
  }
  if (cleanRecord.assetAppreciationDepreciation) {
    delete cleanRecord.assetAppreciationDepreciation.asset;
  }

  delete cleanRecord.tagList;
  delete cleanRecord.typePrettified;

  return cleanRecord as Record;
}

// Note: deleteRecord function removed as we now use markForDeletion

// ----- Lifecycle
onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.desktop-only-notice {
  max-width: 600px;
}

.pro-mode-container {
  width: 100%;
  max-width: none;
}

.pro-mode-header-card {
  max-width: none;
  width: calc(100% - 24px);
  margin-left: 12px;
  margin-right: 12px;
}

.pro-mode-table-card {
  max-width: none;
  width: calc(100% - 24px);
  margin-left: 12px;
  margin-right: 12px;
  overflow-x: auto;
}

.pro-mode-table-container {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 70vh;
  min-width: 1000px;
}

.pro-mode-table {
  width: 100%;
  border-collapse: collapse;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;

  th {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    padding: 8px 6px;
    text-align: left;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 10;
    white-space: nowrap;
  }

  td {
    border: 1px solid #e0e0e0;
    padding: 4px 6px;
    vertical-align: top;

    &.row-status-col {
      width: 40px;
      text-align: center;
    }

    &.date-col {
      width: 120px;
    }

    &.type-col {
      width: 120px;
    }

    &.amount-col {
      width: 90px;
    }

    &.currency-col {
      width: 100px;
    }

    &.wallet-col {
      width: 130px;
    }

    &.avenue-source-col {
      width: 150px;
    }

    &.party-col {
      width: 130px;
    }

    &.notes-col {
      width: 200px;
    }

    &.tags-col {
      width: 180px;
    }

    &.actions-col {
      width: 80px;
    }
  }

  .row-even {
    background-color: #f9f9f9;
  }

  .row-odd {
    background-color: #ffffff;
  }

  .row-changed {
    background-color: #fff3cd !important;
    border-left: 3px solid #ffc107;
  }

  .row-deleted {
    background-color: #f8d7da !important;
    border-left: 3px solid #dc3545;
    opacity: 0.7;
    text-decoration: line-through;
  }
}

.cell-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 12px;
  padding: 2px;
  font-family: inherit;

  &:focus {
    outline: 2px solid #1976d2;
    outline-offset: -1px;
    background-color: white;
  }

  &.date-input {
    cursor: pointer;
  }

  &.number-input {
    text-align: right;
  }

  &.select-input {
    cursor: pointer;
  }
}

.contenteditable-input {
  min-height: 18px;
  cursor: text;

  &:focus {
    outline: 2px solid #1976d2;
    outline-offset: -1px;
    background-color: white;
  }

  &:empty:before {
    content: attr(data-placeholder);
    color: #999;
    font-style: italic;
  }
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.tag-chip {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    opacity: 0.8;
  }
}

.add-tag-select {
  font-size: 10px;
  padding: 2px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  min-width: 80px;
}

.action-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px;
  margin: 1px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background-color: #f5f5f5;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.delete-btn:hover:not(:disabled) {
    background-color: #ffebee;
    border-color: #f44336;
  }

  &.revert-btn:hover:not(:disabled) {
    background-color: #e3f2fd;
    border-color: #2196f3;
  }

  &.restore-btn:hover:not(:disabled) {
    background-color: #e8f5e8;
    border-color: #4caf50;
  }
}
</style>
