<template>
  <q-layout view="lHh Lpr lFf">
    <q-header v-if="userStore.isUserLoggedIn">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          {{ $route.meta.title || "Libre Money" }}
        </q-toolbar-title>

        <!-- Demo Mode Indicator -->
        <div v-if="userStore.currentUser?.isDemoUser" class="demo-indicator-container" @click="goToGetAccountPage">
          <q-icon name="play_circle" color="purple" size="20px" />
          <span class="demo-indicator-text">Demo</span>
          <q-tooltip>Get your own account</q-tooltip>
        </div>

        <!-- Offline Indicator -->
        <div v-else-if="userStore.currentUser?.isOfflineUser" class="offline-indicator-container"
          @click="goToOnlinePage">
          <q-icon name="offline_bolt" color="orange" size="20px" />
          <span class="offline-indicator-text">Offline</span>
          <q-tooltip>Click to go online and sync across devices</q-tooltip>
        </div>

        <!-- Sync Spinner -->
        <div v-if="syncService.status.value.isBackgroundSyncing" class="sync-spinner-container">
          <q-spinner color="white" size="20px" :thickness="3" />
          <span class="sync-spinner-text">Syncing...</span>
        </div>

        <div v-if="$route.meta.title && !isDevDatabase && !isDevEnvironment">Libre Money</div>
        <div class="dev-mode-notification" @click="hideDevModeNotificationClicked"
          v-if="(isDevDatabase || isDevEnvironment || isSitEnvironment) && !hideDevModeNotification">
          <div v-if="isDevDatabase">DEV DB</div>
          <div v-if="isDevEnvironment">DEV ENV</div>
          <div v-if="isSitEnvironment">SIT</div>
        </div>
        <div class="dev-mode-warning" v-if="!isDevDatabase && isDevEnvironment">PROD DB in DEV ENV</div>

        <!-- Theme Toggle -->
        <q-btn flat dense round :icon="isDarkMode ? 'light_mode' : 'dark_mode'" @click="toggleDarkMode">
          <q-tooltip>{{ isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode" }}</q-tooltip>
        </q-btn>

        <q-btn flat dense round icon="perm_identity">
          <q-menu>
            <q-list style="min-width: 150px">
              <q-item clickable v-close-popup @click="fullSyncClicked" :disable="syncService.isSyncing()">
                <q-item-section>Sync</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="troubleshootClicked">
                <q-item-section>Troubleshoot</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="logoutClicked">
                <q-item-section>Logout</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer :dark="isDarkMode" v-model="leftDrawerOpen" show-if-above bordered v-if="userStore.isUserLoggedIn">
      <div class="drawer-content">
        <q-list>
          <q-item-label header> CORE </q-item-label>
          <EssentialLink v-for="link in operationList" :key="link.title" v-bind="link" />
        </q-list>

        <q-list>
          <q-item-label header> ENTITIES </q-item-label>
          <EssentialLink v-for="link in entityList" :key="link.title" v-bind="link" />
        </q-list>

        <q-list>
          <q-item clickable @click="toggleReportsExpanded" class="accounting-header">
            <q-item-section>
              <q-item-label header>REPORTS</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon :name="userInterfaceStore.reportsExpanded ? 'expand_less' : 'expand_more'"
                class="accounting-chevron" />
            </q-item-section>
          </q-item>
          <transition name="slide-down">
            <div v-show="userInterfaceStore.reportsExpanded">
              <EssentialLink v-for="link in reportList" :key="link.title" v-bind="link" />
            </div>
          </transition>
        </q-list>

        <q-list>
          <q-item clickable @click="toggleAccountingExpanded" class="accounting-header">
            <q-item-section>
              <q-item-label header>ACCOUNTING</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon :name="userInterfaceStore.accountingExpanded ? 'expand_less' : 'expand_more'"
                class="accounting-chevron" />
            </q-item-section>
          </q-item>
          <transition name="slide-down">
            <div v-show="userInterfaceStore.accountingExpanded">
              <EssentialLink v-for="link in accountingList" :key="link.title" v-bind="link" />
            </div>
          </transition>
        </q-list>

        <q-list>
          <q-item clickable @click="toggleAdvancedExpanded" class="accounting-header">
            <q-item-section>
              <q-item-label header>ADVANCED</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon :name="userInterfaceStore.advancedExpanded ? 'expand_less' : 'expand_more'"
                class="accounting-chevron" />
            </q-item-section>
          </q-item>
          <transition name="slide-down">
            <div v-show="userInterfaceStore.advancedExpanded">
              <EssentialLink v-for="link in advancedList" :key="link.title" v-bind="link" />
            </div>
          </transition>
        </q-list>

        <q-list>
          <q-item-label header> MISC </q-item-label>
          <EssentialLink v-for="link in miscList" :key="link.title" v-bind="link" />
        </q-list>

        <div style="flex: 1"></div>

        <div class="drawer-bottom">
          <div class="app-version">
            <img class="logo" src="icons/android-chrome-192x192.png" alt="LM" />
            <div @click="verionClicked" style="cursor: pointer">
              <div style="font-size: 16px">Libre Money</div>
              <div style="font-size: 10px; color: rgb(187, 186, 186)">Version: {{ APP_VERSION }}</div>
              <div v-if="userStore.currentUser?.domain"
                style="font-size: 10px; color: rgb(187, 186, 186); margin-top: 4px">
                Domain: {{ userStore.currentUser.domain }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import EssentialLink from "components/sidebar/EssentialLink.vue";
import { useQuasar } from "quasar";
import { APP_BUILD_DATE, APP_BUILD_VERSION, APP_VERSION } from "src/constants/config-constants";
import { PRIMARY_LIGHT, PRIMARY_DARK } from "src/constants/theme-constants";
import { auditLogService } from "src/services/audit-log-service";
import { authService } from "src/services/auth-service";
import { currencyFormatService } from "src/services/currency-format-service";
import { dialogService } from "src/services/dialog-service";
import { globalErrorService } from "src/services/global-error-service";
import { syncService } from "src/services/sync-service";
import { setCssVar } from "quasar";
import { useSettingsStore } from "src/stores/settings";
import { useUserInterfaceStore } from "src/stores/user-interface-store";
import { useUserStore } from "src/stores/user";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { OFFLINE_DOMAIN } from "src/constants/auth-constants";

const route = useRoute();

const operationList = [
  {
    title: "Overview",
    caption: "Balances and Sums",
    icon: "functions",
    link: "#/overview",
  },
  {
    title: "Records",
    caption: "Income, Expenses and more",
    icon: "format_list_bulleted",
    link: "#/records",
  },
  {
    title: "Templates",
    caption: "Quickly add records",
    icon: "bookmarks",
    link: "#/templates",
  },
  {
    title: "Wallets",
    caption: "Cash, Bank and Digital Money",
    icon: "account_balance_wallet",
    link: "#/wallets",
  },
  {
    title: "Assets",
    caption: "Properties and Valuables",
    icon: "account_balance",
    link: "#/assets",
  },
  {
    title: "Loans & Debts",
    caption: "Receivables and Payables",
    icon: "request_quote",
    link: "#/loans-and-debts",
  },
  {
    title: "Rolling Budgets",
    caption: "Monthly recurring budgets",
    icon: "energy_savings_leaf",
    link: "#/rolling-budgets",
  },
];

const entityList = [
  {
    title: "Parties & Vendors",
    caption: "",
    icon: "shop",
    link: "#/parties",
  },
  {
    title: "Tags",
    caption: "",
    icon: "tag",
    link: "#/tags",
  },
  {
    title: "Income Sources",
    caption: "",
    icon: "iso",
    link: "#/income-sources",
  },
  {
    title: "Expense Avenues",
    caption: "",
    icon: "iso",
    link: "#/expense-avenues",
  },
  {
    title: "Currencies",
    caption: "",
    icon: "attach_money",
    link: "#/currencies",
  },
];

const reportList = [
  {
    title: "Budget Analysis",
    caption: "Compare expenses across budget periods",
    icon: "analytics",
    link: "#/budget-analysis",
  },
  {
    title: "Combined Report",
    caption: "",
    icon: "description",
    link: "#/combined-report",
  },
];

const accountingList = [
  {
    title: "Accounts",
    caption: "",
    icon: "calculate",
    link: "#/accounting/accounts",
  },
  {
    title: "Journal",
    caption: "",
    icon: "calculate",
    link: "#/accounting/journal",
  },
  {
    title: "Trial Balance",
    caption: "",
    icon: "calculate",
    link: "#/accounting/trial-balance",
  },
  {
    title: "Income Statement",
    caption: "",
    icon: "calculate",
    link: "#/accounting/income-statement",
  },
  {
    title: "Balance Sheet",
    caption: "",
    icon: "calculate",
    link: "#/accounting/balance-sheet",
  },
];

const advancedList = computed(() => {
  const list = [
    {
      title: "Pro Mode",
      caption: "Edit as a spreadsheet",
      icon: "grid_view",
      link: "#/pro-mode",
    },
    {
      title: "Text Import Rules",
      caption: "Import records from text/SMS",
      icon: "text_snippet",
      link: "#/text-import-rules",
    },
    {
      title: "Backup & Restore",
      caption: "Export/import local database JSON",
      icon: "backup",
      link: "#/backup-restore",
    },
    {
      title: "Audit Log",
      caption: "",
      icon: "history",
      link: "#/audit-log",
    },
    {
      title: "Debug",
      caption: "",
      icon: "bug_report",
      link: "#/debug",
    },
  ];
  if (userStore.currentUser?.isOfflineUser && !userStore.currentUser?.isDemoUser) {
    list.push({
      title: "Go Online",
      caption: "",
      icon: "cloud_sync",
      link: "#/go-online",
    });
  }
  return list;
});

const miscList = [
  {
    title: "Memos",
    caption: "",
    icon: "edit_note",
    link: "#/memos",
  },
  {
    title: "Settings",
    caption: "",
    icon: "settings",
    link: "#/settings",
  },
  {
    title: "About",
    caption: "",
    icon: "contact_support",
    link: "#/about",
  },
];

const leftDrawerOpen = ref(false);
const isDevDatabase = ref(false);
const isDevEnvironment = ref(false);
const isSitEnvironment = ref(false);
const hideDevModeNotification = ref(false);

const userStore = useUserStore();
const settingsStore = useSettingsStore();
const userInterfaceStore = useUserInterfaceStore();
const $q = useQuasar();
const router = useRouter();

const isDarkMode = computed(() => $q.dark.isActive);

function toggleDarkMode() {
  const newDarkMode = !$q.dark.isActive;
  $q.dark.set(newDarkMode);
  settingsStore.setDarkMode(newDarkMode);
  // Update primary color based on theme
  setCssVar("primary", newDarkMode ? PRIMARY_DARK : PRIMARY_LIGHT);
}

function checkIfInDevMode() {
  isDevDatabase.value = false;
  isDevEnvironment.value = false;
  const testDomainStrings = ["test", "debug", "sit-", "dev", OFFLINE_DOMAIN];
  if (userStore.user && userStore.user.domain && testDomainStrings.some((testDomainString) => String(userStore.user?.domain).indexOf(testDomainString) > -1)) {
    isDevDatabase.value = true;
  }

  if (window.location.host.indexOf("localhost") > -1 || window.location.host.indexOf("127.0.0.1") > -1) {
    isDevEnvironment.value = true;
  }

  if (window.location.host.indexOf("labs") > -1) {
    isSitEnvironment.value = true;
  }
}

async function hideDevModeNotificationClicked() {
  const result = await dialogService.confirm("Hide Dev Mode Notification", "Hide the dev mode notification for this session? You will need to refresh the page to see it again.");
  if (result) {
    hideDevModeNotification.value = true;
  }
}

userStore.$subscribe(checkIfInDevMode);
onMounted(() => {
  checkIfInDevMode();
  currencyFormatService.init();
  syncService.setUpPouchdbListener();
  auditLogService.engineInit("MainLayout");
  globalErrorService.setupSubscription();
  handleRouteChange(route.fullPath, null);
  informApplicationHasLoaded();

  // Sync dark mode with saved preference on mount (only if user has explicitly set a preference)
  // The boot file handles initial dark mode setup based on system preference
  if (settingsStore.darkMode !== null && settingsStore.darkMode !== undefined) {
    // Only update if it differs from current state (boot file may have already set it)
    if ($q.dark.isActive !== settingsStore.darkMode) {
      $q.dark.set(settingsStore.darkMode);
      setCssVar("primary", settingsStore.darkMode ? PRIMARY_DARK : PRIMARY_LIGHT);
    }
  } else {
    // No saved preference - ensure primary color matches current dark mode state
    setCssVar("primary", $q.dark.isActive ? PRIMARY_DARK : PRIMARY_LIGHT);
  }
});

function informApplicationHasLoaded() {
  console.debug("informApplicationHasLoaded");
  // @ts-ignore
  window.__lm__hasLoaded = true;
}

async function logoutClicked() {
  let [successful, failureReason] = await authService.logout();
  if (!successful) {
    await dialogService.alert("Logout Error", failureReason as string);
    return;
  }
  // Navigate to post-logout page instead of reloading
  await router.push({ name: "post-logout" });
}

function fullSyncClicked() {
  if (userStore.currentUser?.isOfflineUser) {
    router.push({ name: "go-online" });
    return;
  }
  syncService.doFullSync($q, true, "MainLayout");
}

async function troubleshootClicked() {
  await router.push({ name: "troubleshoot" });
}

async function verionClicked() {
  const title = `Version ${APP_VERSION}`;
  const body = `Internal Build: ${APP_BUILD_VERSION}, Release Date: ${APP_BUILD_DATE}`;
  await dialogService.alert(title, body);
}

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function toggleAccountingExpanded() {
  userInterfaceStore.setAccountingExpanded(!userInterfaceStore.accountingExpanded);
}

function toggleReportsExpanded() {
  userInterfaceStore.setReportsExpanded(!userInterfaceStore.reportsExpanded);
}

function toggleAdvancedExpanded() {
  userInterfaceStore.setAdvancedExpanded(!userInterfaceStore.advancedExpanded);
}

async function goToOnlinePage() {
  await router.push({ name: "go-online" });
}

async function goToGetAccountPage() {
  await router.push({ name: "get-account" });
}

function handleRouteChange(newPath: string, oldPath: string | null) {
  const newRoute = route;
  const oldRoute = router.resolve(oldPath || "/");
  if (newRoute.meta && newRoute.meta.preferLeftDrawerClosed) {
    leftDrawerOpen.value = false;
  } else if (oldRoute.meta && oldRoute.meta.preferLeftDrawerClosed) {
    leftDrawerOpen.value = true;
  }
}

watch(() => route.fullPath, handleRouteChange);

// Watch dark mode changes and update body class
watch(
  () => isDarkMode.value,
  (newValue) => {
    if (newValue) {
      document.body.classList.add("body--dark");
    } else {
      document.body.classList.remove("body--dark");
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  globalErrorService.cancelSubscription();
});
</script>

<style scoped lang="scss">
.demo-indicator-container {
  display: flex;
  align-items: center;
  margin-right: 16px;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(156, 39, 176, 0.2);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(156, 39, 176, 0.3);
  }
}

.demo-indicator-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.offline-indicator-container {
  display: flex;
  align-items: center;
  margin-right: 16px;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(255, 165, 0, 0.1);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(255, 165, 0, 0.2);
  }
}

.offline-indicator-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.sync-spinner-container {
  display: flex;
  align-items: center;
  margin-right: 16px;
  gap: 8px;
}

.sync-spinner-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.drawer-bottom {
  margin-top: 8px;
  background: rgb(29, 29, 29);
  padding: 18px;
  font-size: 12px;
  color: whitesmoke;
}

// Dark theme drawer bottom
body.body--dark .drawer-bottom {
  background: #1e2538; // Match card background color
  color: #cbd5e1; // slate-300 for text
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.app-version {
  display: flex;
  align-items: start;
}

.logo {
  margin-right: 8px;
  margin-bottom: 4px;
  width: 40px;
  height: 40px;
}

.dev-mode-notification {
  background-color: yellow;
  color: black;
  padding: 0px 8px;
  font-weight: bold;
  font-size: 10px;
  text-align: center;
  border-radius: 4px;
  cursor: pointer;
}

.dev-mode-warning {
  background-color: red;
  color: black;
  padding: 0px 8px;
  font-weight: bold;
}

.accounting-header {
  padding: 0;
  min-height: auto;

  .q-item__section {
    padding: 0;
  }

  .q-item__section--main {
    flex: 1;
  }

  .q-item__section--side {
    padding-right: 16px;
  }
}

.accounting-chevron {
  font-size: 20px;
  opacity: 0.7;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
}

.slide-down-enter-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from {
  opacity: 0;
  max-height: 0;
}

.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
