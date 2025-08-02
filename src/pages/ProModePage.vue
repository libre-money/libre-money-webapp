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
      <!-- Spreadsheet -->
      <q-card class="std-card pro-mode-table-card">
        <!-- Header - Start -->
        <div class="title-row q-pa-md q-gutter-sm" style="margin-bottom: -12px">
          <q-select
            v-model="pageSize"
            :options="[25, 50, 100, 200]"
            label="Rows per page"
            dense
            outlined
            style="min-width: 200px"
            @update:model-value="handlePageSizeChange"
          />
          <div class="spacer"></div>
          <q-btn color="secondary" icon="refresh" :label="hasUnsavedChanges ? 'Discard Changes' : 'Reload'" @click="loadData" :disable="isLoading" />
          <q-btn color="secondary" icon="add" label="Add New Record" @click="addNewRecord" />
          <q-btn color="positive" icon="save" label="Save Changes" @click="saveAllChanges" :disable="!hasUnsavedChanges" :loading="isSaving" />

          <q-chip v-if="hasUnsavedChanges" color="orange" text-color="white" icon="edit">
            {{ changedRecords.size }} edit{{ changedRecords.size !== 1 ? "s" : ""
            }}{{ deletedRecords.size > 0 ? ", " + deletedRecords.size + " deletion" + (deletedRecords.size !== 1 ? "s" : "") : "" }}
          </q-chip>
        </div>
        <!-- Header - End -->

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
                  <th class="avenue-source-col">Avenue/Source/Asset</th>
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
                      <option value="asset-appreciation-depreciation">Asset Appreciation/Depreciation</option>
                      <option value="lending">Lending</option>
                      <option value="borrowing">Borrowing</option>
                      <option value="repayment-given">Repayment Given</option>
                      <option value="repayment-received">Repayment Received</option>
                    </select>
                  </td>

                  <!-- Amount Column -->
                  <td class="amount-col">
                    <template v-if="record.type === 'money-transfer'">
                      <div class="money-transfer-amounts">
                        <div class="amount-row">
                          <label class="amount-label">From:</label>
                          <input
                            type="number"
                            step="1"
                            :value="record.moneyTransfer?.fromAmount || 0"
                            @input="updateMoneyTransferField(record._id!, 'fromAmount', ($event.target as HTMLInputElement).value)"
                            class="cell-input number-input money-transfer-input"
                          />
                        </div>
                        <div class="amount-row">
                          <label class="amount-label">To:</label>
                          <input
                            type="number"
                            step="1"
                            :value="record.moneyTransfer?.toAmount || 0"
                            @input="updateMoneyTransferField(record._id!, 'toAmount', ($event.target as HTMLInputElement).value)"
                            class="cell-input number-input money-transfer-input"
                          />
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <input
                        type="number"
                        step="1"
                        :value="getRecordAmount(record)"
                        @input="updateRecordAmount(record._id!, ($event.target as HTMLInputElement).value)"
                        class="cell-input number-input"
                      />
                    </template>
                  </td>

                  <!-- Currency Column -->
                  <td class="currency-col">
                    <template v-if="record.type === 'money-transfer'">
                      <div class="money-transfer-currencies">
                        <div class="currency-row">
                          <label class="currency-label">From:</label>
                          <select
                            :value="record.moneyTransfer?.fromCurrencyId"
                            @change="updateMoneyTransferField(record._id!, 'fromCurrencyId', ($event.target as HTMLSelectElement).value)"
                            class="cell-input select-input money-transfer-select"
                          >
                            <option v-for="currency in currencies" :key="currency._id" :value="currency._id">{{ currency.sign }}</option>
                          </select>
                        </div>
                        <div class="currency-row">
                          <label class="currency-label">To:</label>
                          <select
                            :value="record.moneyTransfer?.toCurrencyId"
                            @change="updateMoneyTransferField(record._id!, 'toCurrencyId', ($event.target as HTMLSelectElement).value)"
                            class="cell-input select-input money-transfer-select"
                          >
                            <option v-for="currency in currencies" :key="currency._id" :value="currency._id">{{ currency.sign }}</option>
                          </select>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <select
                        :value="getRecordCurrency(record)"
                        @change="updateRecordCurrency(record._id!, ($event.target as HTMLSelectElement).value)"
                        class="cell-input select-input"
                      >
                        <option v-for="currency in currencies" :key="currency._id" :value="currency._id">{{ currency.sign }} {{ currency.name }}</option>
                      </select>
                    </template>
                  </td>

                  <!-- Wallet Column -->
                  <td class="wallet-col">
                    <template v-if="record.type === 'money-transfer'">
                      <div class="money-transfer-wallets">
                        <div class="wallet-row">
                          <label class="wallet-label">From:</label>
                          <select
                            :value="record.moneyTransfer?.fromWalletId"
                            @change="updateMoneyTransferField(record._id!, 'fromWalletId', ($event.target as HTMLSelectElement).value)"
                            class="cell-input select-input money-transfer-select"
                          >
                            <option v-for="wallet in getFilteredWallets(record.moneyTransfer?.fromCurrencyId)" :key="wallet._id" :value="wallet._id">
                              {{ wallet.name }}
                            </option>
                          </select>
                        </div>
                        <div class="wallet-row">
                          <label class="wallet-label">To:</label>
                          <select
                            :value="record.moneyTransfer?.toWalletId"
                            @change="updateMoneyTransferField(record._id!, 'toWalletId', ($event.target as HTMLSelectElement).value)"
                            class="cell-input select-input money-transfer-select"
                          >
                            <option v-for="wallet in getFilteredWallets(record.moneyTransfer?.toCurrencyId)" :key="wallet._id" :value="wallet._id">
                              {{ wallet.name }}
                            </option>
                          </select>
                        </div>
                      </div>
                    </template>
                    <template v-else-if="record.type === 'asset-appreciation-depreciation'">
                      <span class="text-grey-6">-</span>
                    </template>
                    <template v-else>
                      <select
                        :value="getRecordWallet(record)"
                        @change="updateRecordWallet(record._id!, ($event.target as HTMLSelectElement).value)"
                        class="cell-input select-input"
                      >
                        <option v-for="wallet in getFilteredWallets(getRecordCurrency(record))" :key="wallet._id" :value="wallet._id">
                          {{ wallet.name }}
                        </option>
                      </select>
                    </template>
                  </td>

                  <!-- Avenue/Source/Asset Column -->
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
                    <select
                      v-else-if="record.type === 'asset-purchase' || record.type === 'asset-sale' || record.type === 'asset-appreciation-depreciation'"
                      :value="getRecordAsset(record)"
                      @change="updateRecordAsset(record._id!, ($event.target as HTMLSelectElement).value)"
                      class="cell-input select-input"
                    >
                      <option v-for="asset in assets" :key="asset._id" :value="asset._id">
                        {{ asset.name }}
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

          <!-- Pagination Controls - Bottom -->
          <div v-if="!isLoading && totalPages > 1" class="pagination-controls q-mt-md">
            <div class="pagination-info">
              Showing {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalRecords) }} of {{ totalRecords }} records
            </div>
            <q-pagination v-model="currentPage" :max="totalPages" :max-pages="7" boundary-numbers @update:model-value="handlePageChange" :disable="isLoading" />
          </div>
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { Collection, RecordType } from "src/constants/constants";
import { Asset } from "src/models/asset";
import { Currency } from "src/models/currency";
import { ExpenseAvenue } from "src/models/expense-avenue";
import { IncomeSource } from "src/models/income-source";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { Party } from "src/models/party";
import { Record } from "src/models/record";
import { Tag } from "src/models/tag";
import { Wallet } from "src/models/wallet";
import { dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { recordService } from "src/services/record-service";
import { deepClone, guessFontColorCode } from "src/utils/misc-utils";
import { Ref, computed, onMounted, ref } from "vue";

const $q = useQuasar();

// ----- Refs
const isLoading = ref(false);
const isSaving = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const records: Ref<InferredRecord[]> = ref([]);
const originalRecords: Ref<Map<string, InferredRecord>> = ref(new Map());
const changedRecords: Ref<Map<string, InferredRecord>> = ref(new Map());
const deletedRecords: Ref<Set<string>> = ref(new Set<string>());

// Pagination
const currentPage = ref(1);
const pageSize = ref(50);
const totalRecords = ref(0);
const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize.value));
const allRawRecords: Ref<Record[]> = ref([]);

// Reference data
const currencies: Ref<Currency[]> = ref([]);
const wallets: Ref<Wallet[]> = ref([]);
const expenseAvenues: Ref<ExpenseAvenue[]> = ref([]);
const incomeSources: Ref<IncomeSource[]> = ref([]);
const parties: Ref<Party[]> = ref([]);
const tags: Ref<Tag[]> = ref([]);
const assets: Ref<Asset[]> = ref([]);

// ----- Computed
const hasUnsavedChanges = computed(() => changedRecords.value.size > 0 || deletedRecords.value.size > 0);

// ----- Functions
async function loadData() {
  isLoading.value = true;

  try {
    loadingIndicator.value?.startPhase({ phase: 1, weight: 30, label: "Loading reference data" });

    // Load reference data in parallel with records for better performance
    const [currencyDocs, walletDocs, expenseAvenueDocs, incomeSourceDocs, partyDocs, tagDocs, assetDocs, recordDocs] = await Promise.all([
      pouchdbService.listByCollection(Collection.CURRENCY),
      pouchdbService.listByCollection(Collection.WALLET),
      pouchdbService.listByCollection(Collection.EXPENSE_AVENUE),
      pouchdbService.listByCollection(Collection.INCOME_SOURCE),
      pouchdbService.listByCollection(Collection.PARTY),
      pouchdbService.listByCollection(Collection.TAG),
      pouchdbService.listByCollection(Collection.ASSET),
      pouchdbService.listByCollection(Collection.RECORD),
    ]);

    currencies.value = currencyDocs.docs as Currency[];
    wallets.value = walletDocs.docs as Wallet[];
    expenseAvenues.value = expenseAvenueDocs.docs as ExpenseAvenue[];
    incomeSources.value = incomeSourceDocs.docs as IncomeSource[];
    parties.value = partyDocs.docs as Party[];
    tags.value = tagDocs.docs as Tag[];
    assets.value = assetDocs.docs as Asset[];

    loadingIndicator.value?.startPhase({ phase: 2, weight: 40, label: "Processing records" });

    // Store all raw records and sort them
    allRawRecords.value = recordDocs.docs as Record[];
    allRawRecords.value.sort((a, b) => (b.transactionEpoch || 0) - (a.transactionEpoch || 0));

    totalRecords.value = allRawRecords.value.length;

    // Reset to first page when reloading data
    currentPage.value = 1;

    // Clear all tracking when reloading
    originalRecords.value.clear();
    changedRecords.value.clear();
    deletedRecords.value.clear();

    // Load current page
    await loadCurrentPage();
  } catch (error) {
    console.error("Error loading data:", error);
    await dialogService.alert("Error", "Failed to load data for Pro Mode.");
  } finally {
    isLoading.value = false;
  }
}

async function loadCurrentPage() {
  if (allRawRecords.value.length === 0) return;

  loadingIndicator.value?.startPhase({ phase: 3, weight: 30, label: "Loading page data" });

  // Calculate pagination
  const startIndex = (currentPage.value - 1) * pageSize.value;
  const endIndex = Math.min(startIndex + pageSize.value, allRawRecords.value.length);
  const pageRecords = allRawRecords.value.slice(startIndex, endIndex);

  // Convert to inferred records for current page only
  const inferredRecords = await recordService.inferInBatch(pageRecords);

  // Preserve changes: replace fresh records with modified versions if they exist
  const finalRecords = inferredRecords.map((record) => {
    if (record._id && changedRecords.value.has(record._id)) {
      // Use the modified version instead of the fresh inferred version
      return changedRecords.value.get(record._id)!;
    }
    return record;
  });

  records.value = finalRecords;

  // Store original copies for change tracking (only for records we haven't seen before)
  inferredRecords.forEach((record) => {
    if (record._id && !originalRecords.value.has(record._id)) {
      originalRecords.value.set(record._id, deepClone(record));
    }
  });
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

function updateMoneyTransferField(recordId: string, field: string, value: string) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  // Initialize moneyTransfer structure if it doesn't exist
  if (!record.moneyTransfer) {
    const defaultWallet = wallets.value[0];
    const fromWalletId = defaultWallet?._id || "";
    const toWalletId = defaultWallet?._id || "";
    const defaultCurrency = defaultWallet?.currencyId || "";

    record.moneyTransfer = {
      fromWalletId: fromWalletId,
      fromCurrencyId: defaultCurrency,
      fromAmount: 0,
      toWalletId: toWalletId,
      toCurrencyId: defaultCurrency,
      toAmount: 0,
    } as any;
  }

  if (field === "fromAmount" || field === "toAmount") {
    (record.moneyTransfer as any)[field] = parseFloat(value) || 0;
  } else {
    (record.moneyTransfer as any)[field] = value;

    // If currency changes, update wallet to match currency if current wallet doesn't match
    if (field === "fromCurrencyId" && record.moneyTransfer) {
      const currentWallet = wallets.value.find((w) => w._id === record.moneyTransfer?.fromWalletId);
      if (!currentWallet || currentWallet.currencyId !== value) {
        const matchingWallet = wallets.value.find((w) => w.currencyId === value);
        if (matchingWallet && record.moneyTransfer) {
          record.moneyTransfer.fromWalletId = matchingWallet._id!;
        }
      }
    } else if (field === "toCurrencyId" && record.moneyTransfer) {
      const currentWallet = wallets.value.find((w) => w._id === record.moneyTransfer?.toWalletId);
      if (!currentWallet || currentWallet.currencyId !== value) {
        const matchingWallet = wallets.value.find((w) => w.currencyId === value);
        if (matchingWallet && record.moneyTransfer) {
          record.moneyTransfer.toWalletId = matchingWallet._id!;
        }
      }
    }
  }

  markRecordChanged(recordId);
}

function updateRecordCurrency(recordId: string, currencyId: string) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  // Update currency based on record type
  if (record.expense) {
    record.expense.currencyId = currencyId;
    // Auto-update wallet to match currency if current wallet doesn't match
    const currentWallet = wallets.value.find((w) => w._id === record.expense?.walletId);
    if (!currentWallet || currentWallet.currencyId !== currencyId) {
      const matchingWallet = wallets.value.find((w) => w.currencyId === currencyId);
      if (matchingWallet && record.expense) {
        record.expense.walletId = matchingWallet._id!;
      }
    }
  } else if (record.income) {
    record.income.currencyId = currencyId;
    const currentWallet = wallets.value.find((w) => w._id === record.income?.walletId);
    if (!currentWallet || currentWallet.currencyId !== currencyId) {
      const matchingWallet = wallets.value.find((w) => w.currencyId === currencyId);
      if (matchingWallet && record.income) {
        record.income.walletId = matchingWallet._id!;
      }
    }
  } else if (record.lending) {
    record.lending.currencyId = currencyId;
    const currentWallet = wallets.value.find((w) => w._id === record.lending?.walletId);
    if (!currentWallet || currentWallet.currencyId !== currencyId) {
      const matchingWallet = wallets.value.find((w) => w.currencyId === currencyId);
      if (matchingWallet && record.lending) {
        record.lending.walletId = matchingWallet._id!;
      }
    }
  } else if (record.borrowing) {
    record.borrowing.currencyId = currencyId;
    const currentWallet = wallets.value.find((w) => w._id === record.borrowing?.walletId);
    if (!currentWallet || currentWallet.currencyId !== currencyId) {
      const matchingWallet = wallets.value.find((w) => w.currencyId === currencyId);
      if (matchingWallet && record.borrowing) {
        record.borrowing.walletId = matchingWallet._id!;
      }
    }
  } else if (record.repaymentGiven) {
    record.repaymentGiven.currencyId = currencyId;
    const currentWallet = wallets.value.find((w) => w._id === record.repaymentGiven?.walletId);
    if (!currentWallet || currentWallet.currencyId !== currencyId) {
      const matchingWallet = wallets.value.find((w) => w.currencyId === currencyId);
      if (matchingWallet && record.repaymentGiven) {
        record.repaymentGiven.walletId = matchingWallet._id!;
      }
    }
  } else if (record.repaymentReceived) {
    record.repaymentReceived.currencyId = currencyId;
    const currentWallet = wallets.value.find((w) => w._id === record.repaymentReceived?.walletId);
    if (!currentWallet || currentWallet.currencyId !== currencyId) {
      const matchingWallet = wallets.value.find((w) => w.currencyId === currencyId);
      if (matchingWallet && record.repaymentReceived) {
        record.repaymentReceived.walletId = matchingWallet._id!;
      }
    }
  } else if (record.assetPurchase) {
    record.assetPurchase.currencyId = currencyId;
    const currentWallet = wallets.value.find((w) => w._id === record.assetPurchase?.walletId);
    if (!currentWallet || currentWallet.currencyId !== currencyId) {
      const matchingWallet = wallets.value.find((w) => w.currencyId === currencyId);
      if (matchingWallet && record.assetPurchase) {
        record.assetPurchase.walletId = matchingWallet._id!;
      }
    }
  } else if (record.assetSale) {
    record.assetSale.currencyId = currencyId;
    const currentWallet = wallets.value.find((w) => w._id === record.assetSale?.walletId);
    if (!currentWallet || currentWallet.currencyId !== currencyId) {
      const matchingWallet = wallets.value.find((w) => w.currencyId === currencyId);
      if (matchingWallet && record.assetSale) {
        record.assetSale.walletId = matchingWallet._id!;
      }
    }
  } else if (record.assetAppreciationDepreciation) {
    record.assetAppreciationDepreciation.currencyId = currencyId;
    // No wallet update needed for asset appreciation/depreciation
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

function getFilteredWallets(currencyId?: string): Wallet[] {
  if (!currencyId) {
    return wallets.value;
  }
  return wallets.value.filter((wallet) => wallet.currencyId === currencyId);
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
  // Asset appreciation/depreciation doesn't have a wallet
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

function getRecordAsset(record: InferredRecord): string {
  if (record.assetPurchase) return record.assetPurchase.assetId;
  if (record.assetSale) return record.assetSale.assetId;
  if (record.assetAppreciationDepreciation) return record.assetAppreciationDepreciation.assetId;
  return "";
}

function updateRecordAsset(recordId: string, assetId: string) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  // Update asset based on record type
  if (record.assetPurchase) {
    record.assetPurchase.assetId = assetId;
  } else if (record.assetSale) {
    record.assetSale.assetId = assetId;
  } else if (record.assetAppreciationDepreciation) {
    record.assetAppreciationDepreciation.assetId = assetId;
  }

  markRecordChanged(recordId);
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

// ----- New Record Functions
function addNewRecord() {
  const now = new Date();
  const tempId = `temp_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create a new record with defaults
  const newRecord = {
    _id: tempId,
    $collection: "record",
    type: "expense" as const,
    transactionEpoch: now.getTime(),
    tagIdList: [] as string[],
    notes: "",
    expense: {
      amount: 0,
      amountPaid: 0,
      currencyId: currencies.value[0]?._id || "",
      walletId: wallets.value[0]?._id || "",
      expenseAvenueId: expenseAvenues.value[0]?._id || "",
      partyId: null as string | null,
    },
  };

  // Add inferred properties for display
  const inferredRecord = {
    ...newRecord,
    currency: currencies.value[0],
    wallet: wallets.value[0],
    expenseAvenue: expenseAvenues.value[0],
  } as any;

  // Add to the beginning of current page
  records.value.unshift(inferredRecord);

  // Track as a new/changed record
  changedRecords.value.set(tempId, deepClone(inferredRecord));

  // Add to allRawRecords at the beginning (since we sort by date desc)
  allRawRecords.value.unshift(stripInferenceData(inferredRecord));
  totalRecords.value = allRawRecords.value.length;

  // If this would exceed page size, remove the last record from view
  if (records.value.length > pageSize.value) {
    records.value.pop();
  }
}

// ----- Change Tracking
function markRecordChanged(recordId: string) {
  const record = records.value.find((r) => r._id === recordId);
  if (!record) return;

  // Don't track changes for records marked for deletion
  if (deletedRecords.value.has(recordId)) return;

  // Store the modified record in the changes map
  changedRecords.value.set(recordId, deepClone(record));

  // Also update the raw record in allRawRecords to maintain data consistency
  const rawRecordIndex = allRawRecords.value.findIndex((r) => r._id === recordId);
  if (rawRecordIndex > -1) {
    // Strip inference data and update the raw record
    const cleanRecord = stripInferenceData(record);
    allRawRecords.value[rawRecordIndex] = cleanRecord;
  }
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

  // Remove from changed records
  changedRecords.value.delete(recordId);

  // Also revert the raw record in allRawRecords
  const rawRecordIndex = allRawRecords.value.findIndex((r) => r._id === recordId);
  if (rawRecordIndex > -1) {
    const cleanOriginal = stripInferenceData(original);
    allRawRecords.value[rawRecordIndex] = cleanOriginal;
  }
}

function markForDeletion(recordId: string) {
  // Check if this is a temporary record (newly added, not saved)
  const isTemporaryRecord = recordId.startsWith("temp_");

  if (isTemporaryRecord) {
    // For temporary records, remove them immediately since they were never saved
    records.value = records.value.filter((r) => r._id !== recordId);
    allRawRecords.value = allRawRecords.value.filter((r) => r._id !== recordId);
    changedRecords.value.delete(recordId);
    originalRecords.value.delete(recordId);
    totalRecords.value = allRawRecords.value.length;
  } else {
    // For existing records, mark for deletion to be committed later
    deletedRecords.value.add(recordId);
    // Remove from changed records since deletion takes precedence
    changedRecords.value.delete(recordId);

    // Also revert any changes to the raw record since it's being deleted
    const original = originalRecords.value.get(recordId);
    if (original) {
      const rawRecordIndex = allRawRecords.value.findIndex((r) => r._id === recordId);
      if (rawRecordIndex > -1) {
        const cleanOriginal = stripInferenceData(original);
        allRawRecords.value[rawRecordIndex] = cleanOriginal;
      }
    }
  }
}

function unmarkForDeletion(recordId: string) {
  deletedRecords.value.delete(recordId);

  // If the record had changes before being marked for deletion, we should restore them
  // Note: The changes are preserved in the UI, so we just need to re-sync with allRawRecords
  const record = records.value.find((r) => r._id === recordId);
  if (record) {
    markRecordChanged(recordId);
  }
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
      const isNewRecord = record._id?.startsWith("temp_");

      // Strip the inference data before saving
      const cleanRecord = stripInferenceData(record);

      // For new records, remove the temporary ID so PouchDB assigns a real one
      if (isNewRecord) {
        delete cleanRecord._id;
        delete cleanRecord._rev;
      }

      const savedResult = await pouchdbService.upsertDoc(cleanRecord);

      // Update the record with the new revision to prevent conflicts
      if (savedResult.ok) {
        const oldId = record._id;
        const newId = savedResult.id;
        const newRev = savedResult.rev;

        // Update the record in records.value
        const recordInView = records.value.find((r) => r._id === oldId);
        if (recordInView) {
          recordInView._id = newId;
          recordInView._rev = newRev;
        }

        // Update the record in allRawRecords
        const rawRecordIndex = allRawRecords.value.findIndex((r) => r._id === oldId);
        if (rawRecordIndex > -1) {
          allRawRecords.value[rawRecordIndex]._id = newId;
          allRawRecords.value[rawRecordIndex]._rev = newRev;
        }

        // Update the record in changedRecords
        if (isNewRecord && oldId) {
          // Remove old temp ID and add with new real ID
          changedRecords.value.delete(oldId);
        }
        record._id = newId;
        record._rev = newRev;
      }
    }

    // Delete marked records
    for (const recordId of recordsToDelete) {
      const record = records.value.find((r) => r._id === recordId);
      if (record) {
        // Only delete from database if it's not a temporary record
        const isTemporaryRecord = recordId.startsWith("temp_");
        if (!isTemporaryRecord) {
          await pouchdbService.removeDoc(record);
        }
        // For temporary records, we just remove them from local state (done below)
      }
    }

    // Remove deleted records from local state and original data
    records.value = records.value.filter((record) => !deletedRecords.value.has(record._id || ""));

    // Remove from allRawRecords as well to keep pagination accurate
    allRawRecords.value = allRawRecords.value.filter((record) => !deletedRecords.value.has(record._id || ""));
    totalRecords.value = allRawRecords.value.length;

    // Clear change tracking
    changedRecords.value.clear();
    deletedRecords.value.clear();

    // Update original records for remaining records
    records.value.forEach((record) => {
      if (record._id) {
        originalRecords.value.set(record._id, deepClone(record));
      }
    });

    // Refresh current page if needed (in case records were deleted and page is now empty)
    if (records.value.length === 0 && currentPage.value > 1) {
      currentPage.value = Math.max(1, currentPage.value - 1);
      await loadCurrentPage();
    }

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

// ----- Pagination Functions
async function handlePageChange(newPage: number) {
  if (isLoading.value) return;

  currentPage.value = newPage;
  await loadCurrentPage();
}

async function handlePageSizeChange() {
  if (isLoading.value) return;

  // Recalculate current page to maintain position as much as possible
  const currentFirstRecordIndex = (currentPage.value - 1) * pageSize.value;
  currentPage.value = Math.floor(currentFirstRecordIndex / pageSize.value) + 1;

  await loadCurrentPage();
}

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
  max-height: 60vh;
  min-width: 1000px;
}

.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .pagination-info {
    font-size: 14px;
    color: #666;
  }
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

  // Money transfer specific styling
  .money-transfer-amounts,
  .money-transfer-currencies,
  .money-transfer-wallets {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .amount-row,
  .currency-row,
  .wallet-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .amount-label,
  .currency-label,
  .wallet-label {
    font-size: 10px;
    min-width: 30px;
    color: #666;
  }

  .money-transfer-input,
  .money-transfer-select {
    flex: 1;
    min-width: 60px;
  }

  // Adjust column widths for money transfers
  .amount-col {
    min-width: 120px;
  }

  .currency-col {
    min-width: 100px;
  }

  .wallet-col {
    min-width: 160px;
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
