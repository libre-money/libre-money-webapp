<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Audit Log</div>
        <q-btn color="secondary" text-color="white" label="Sync" icon="sync" @click="syncAuditLogs" class="q-ml-sm" />
        <q-btn color="primary" text-color="white" label="Refresh" icon="refresh" @click="loadData" :loading="isLoading" />
      </div>

      <!-- Filters -->
      <div class="q-pa-md">
        <q-expansion-item icon="filter_alt" label="Filters" header-class="text-primary">
          <div class="row q-gutter-md q-pa-md">
            <div class="col-md-3 col-sm-6 col-xs-12">
              <q-select v-model="selectedAction" :options="actionOptions" label="Action" emit-value map-options clearable outlined dense />
            </div>
            <div class="col-md-3 col-sm-6 col-xs-12">
              <q-input v-model="usernameFilter" label="Username" outlined dense clearable />
            </div>
            <div class="col-md-3 col-sm-6 col-xs-12">
              <q-input v-model="documentIdFilter" label="Document ID" outlined dense clearable />
            </div>
            <div class="col-md-3 col-sm-6 col-xs-12">
              <q-btn color="primary" label="Apply Filters" @click="applyFilters" :loading="isLoading" />
            </div>
          </div>
        </q-expansion-item>
      </div>

      <!-- Data Table -->
      <div class="q-pa-md">
        <q-table
          :loading="isLoading"
          title="Audit Entries"
          :rows="rows"
          :columns="columns"
          row-key="_id"
          flat
          bordered
          :rows-per-page-options="rowsPerPageOptions"
          binary-state-sort
          v-model:pagination="pagination"
          @request="dataForTableRequested"
          class="std-table-non-morphing"
          style="font-family: 'Courier New', Courier, monospace"
        >
          <template v-slot:body-cell-timestamp="props">
            <q-td :props="props">
              {{ formatTimestamp(props.value) }}
            </q-td>
          </template>

          <template v-slot:body-cell-action="props">
            <q-td :props="props">
              <q-chip :color="getActionColor(props.value)" text-color="white" :label="props.value" size="sm" />
            </q-td>
          </template>

          <template v-slot:body-cell-documentData="props">
            <q-td :props="props" style="min-width: 100px">
              <div v-if="props.row.action === 'upsert' && (props.row.oldDocumentData || props.row.newDocumentData)" class="q-gutter-xs">
                <q-btn
                  v-if="props.row.oldDocumentData"
                  flat
                  dense
                  color="orange"
                  label="Old"
                  @click="viewDocumentData(props.row.oldDocumentData, 'Old Document')"
                  size="sm"
                />
                <q-btn
                  v-if="props.row.newDocumentData"
                  flat
                  dense
                  color="green"
                  label="New"
                  @click="viewDocumentData(props.row.newDocumentData, 'New Document')"
                  size="sm"
                />
              </div>
              <q-btn v-else-if="props.value" flat dense color="primary" label="View" @click="viewDocumentData(props.value, 'Document Data')" />
              <span v-else>-</span>
            </q-td>
          </template>

          <template v-slot:body-cell-userAgent="props">
            <q-td :props="props">
              <q-tooltip v-if="props.value">{{ props.value }}</q-tooltip>
              {{ getBrowserFromUserAgent(props.value) }}
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- Statistics -->
      <div class="q-pa-md" v-if="rows.length > 0">
        <q-separator class="q-mb-md" />
        <div class="row q-gutter-md">
          <q-card flat bordered class="col">
            <q-card-section class="text-center">
              <div class="text-h6">{{ rows.length }}</div>
              <div class="text-caption">Total Entries</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center">
              <div class="text-h6">{{ uniqueUsers.size }}</div>
              <div class="text-caption">Unique Users</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center">
              <div class="text-h6">{{ uniqueSessions.size }}</div>
              <div class="text-caption">Unique Sessions</div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </q-card>

    <!-- Document Data Dialog -->
    <q-dialog v-model="showDocumentDialog" maximized>
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ selectedDocumentTitle }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <pre class="document-data-pre">{{ JSON.stringify(selectedDocumentData, null, 2) }}</pre>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { auditLogService, AuditLogEntry } from "src/services/audit-log-service";
import { computed, onMounted, ref } from "vue";
import { date } from "quasar";
import { usePaginationSizeStore } from "src/stores/pagination";
import { Collection, rowsPerPageOptions } from "src/constants/constants";
import { dialogService } from "src/services/dialog-service";
import { recordService } from "src/services/record-service";
import { Record } from "src/models/record";

const isLoading = ref(false);
const rows = ref<AuditLogEntry[]>([]);
const showDocumentDialog = ref(false);
const selectedDocumentData = ref<unknown>(null);
const selectedDocumentTitle = ref<string>("Document Data");

// Filters
const selectedAction = ref<string | null>(null);
const usernameFilter = ref("");
const documentIdFilter = ref("");

const actionOptions = [
  { label: "All", value: null },
  { label: "Upsert", value: "upsert" },
  { label: "Remove", value: "remove" },
  { label: "Sync", value: "sync" },
];

const paginationSizeStore = usePaginationSizeStore();
const pagination = ref({
  sortBy: "timestamp",
  descending: true,
  page: 1,
  rowsPerPage: paginationSizeStore.paginationSize,
  rowsNumber: 0,
});

const columns = [
  {
    name: "timestamp",
    required: true,
    label: "Timestamp",
    align: "left" as const,
    field: "timestamp",
    sortable: true,
  },
  {
    name: "action",
    required: true,
    label: "Action",
    align: "center" as const,
    field: "action",
    sortable: true,
  },
  {
    name: "username",
    required: true,
    label: "Username",
    align: "left" as const,
    field: "username",
    sortable: true,
  },
  {
    name: "documentId",
    label: "Document ID",
    align: "left" as const,
    field: "documentId",
    sortable: true,
  },
  {
    name: "documentCollection",
    label: "Collection",
    align: "left" as const,
    field: "documentCollection",
    sortable: true,
  },
  {
    name: "documentData",
    label: "Data",
    align: "center" as const,
    field: "documentData",
    sortable: false,
  },
  // {
  //   name: "sessionId",
  //   label: "Session",
  //   align: "left" as const,
  //   field: "sessionId",
  //   sortable: true,
  //   format: (val: string) => (val ? val.substring(0, 8) + "..." : ""),
  // },
  // {
  //   name: "userAgent",
  //   label: "Browser",
  //   align: "left" as const,
  //   field: "userAgent",
  //   sortable: true,
  // },
];

// Computed properties

const uniqueUsers = computed(() => {
  const users = new Set<string>();
  rows.value.forEach((row) => {
    if (row.username) users.add(row.username);
  });
  return users;
});

const uniqueSessions = computed(() => {
  const sessions = new Set<string>();
  rows.value.forEach((row) => {
    if (row.sessionId) sessions.add(row.sessionId);
  });
  return sessions;
});

function applyOrdering(docList: AuditLogEntry[], sortBy: string, descending: boolean) {
  if (sortBy === "timestamp") {
    docList.sort((a, b) => {
      return (a.timestamp! - b.timestamp!) * (descending ? -1 : 1);
    });
  } else if (sortBy === "action") {
    docList.sort((a, b) => {
      return a.action.localeCompare(b.action) * (descending ? -1 : 1);
    });
  } else if (sortBy === "username") {
    docList.sort((a, b) => {
      return (a.username || "").localeCompare(b.username || "") * (descending ? -1 : 1);
    });
  } else if (sortBy === "documentId") {
    docList.sort((a, b) => {
      return (a.documentId || "").localeCompare(b.documentId || "") * (descending ? -1 : 1);
    });
  } else if (sortBy === "documentCollection") {
    docList.sort((a, b) => {
      return (a.documentCollection || "").localeCompare(b.documentCollection || "") * (descending ? -1 : 1);
    });
  } else if (sortBy === "sessionId") {
    docList.sort((a, b) => {
      return (a.sessionId || "").localeCompare(b.sessionId || "") * (descending ? -1 : 1);
    });
  }
}

async function dataForTableRequested(props: any) {
  let inputPagination = (props as any)?.pagination || pagination.value;

  const { page, rowsPerPage, sortBy, descending } = inputPagination;
  paginationSizeStore.setPaginationSize(rowsPerPage);

  isLoading.value = true;

  const skip = (page - 1) * rowsPerPage;
  const limit = rowsPerPage;

  try {
    const result = await auditLogService.getAuditLogs({
      limit: 10000, // Load all entries for proper filtering/sorting
      descending: false, // We'll sort ourselves
    });
    let docList = result.rows;

    // Apply filters
    if (selectedAction.value) {
      docList = docList.filter((doc) => doc.action === selectedAction.value);
    }
    if (usernameFilter.value) {
      let regex = new RegExp(`.*${usernameFilter.value}.*`, "i");
      docList = docList.filter((doc) => regex.test(doc.username || ""));
    }
    if (documentIdFilter.value) {
      let regex = new RegExp(`.*${documentIdFilter.value}.*`, "i");
      docList = docList.filter((doc) => regex.test(doc.documentId || ""));
    }

    applyOrdering(docList, sortBy, descending);

    let totalRowCount = docList.length;
    let currentRows = docList.slice(skip, skip + limit);

    console.debug({ currentRows });
    rows.value = currentRows;

    pagination.value.rowsNumber = totalRowCount;
    pagination.value.page = page;
    pagination.value.rowsPerPage = rowsPerPage;
    pagination.value.sortBy = sortBy;
    pagination.value.descending = descending;
  } catch (error) {
    console.error("Failed to load audit logs:", error);
  } finally {
    isLoading.value = false;
  }
}

async function loadData() {
  dataForTableRequested(null);
}

function applyFilters() {
  loadData();
}

function formatTimestamp(timestamp: number): string {
  if (!timestamp) return "";
  return date.formatDate(new Date(timestamp), "YYYY-MM-DD HH:mm:ss");
}

function getActionColor(action: string): string {
  switch (action) {
    case "upsert":
      return "green";
    case "remove":
      return "red";
    case "sync":
      return "blue";
    default:
      return "grey";
  }
}

function getBrowserFromUserAgent(userAgent: string): string {
  if (!userAgent) return "Unknown";

  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";

  return "Other";
}

async function viewDocumentData(documentData: any, title = "Document Data") {
  try {
    documentData = JSON.parse(JSON.stringify(documentData)) as any;
    if ("$collection" in documentData && documentData.$collection === Collection.RECORD) {
      documentData = await recordService.inferRecord(documentData as Record);
    }
  } catch (ex) {
    console.warn("Failed to elaborate document data:", ex);
  }
  selectedDocumentData.value = documentData;
  selectedDocumentTitle.value = title;
  showDocumentDialog.value = true;
}

function syncAuditLogs() {
  if (!auditLogService.isRemoteEnabled()) {
    dialogService.alert("Sync Audit Logs", "Remote sync for audit logs is not enabled. Please contact your administrator or see the relevant documentation.");
    return;
  }
  auditLogService.syncAuditLogs();
}

// Lifecycle
onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.document-data-pre {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow: auto;
  max-height: 70vh;
  font-family: "Courier New", Courier, monospace;
  font-size: 12px;
  line-height: 1.4;
}

.std-card {
  width: 95%;
  max-width: none;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 1.5rem;
  font-weight: 500;
  color: #1976d2;
}
</style>
