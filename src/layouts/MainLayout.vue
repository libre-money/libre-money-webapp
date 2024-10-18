<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated v-if="userStore.isUserLoggedIn">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          {{ $route.meta.title || "Cash Keeper" }}
        </q-toolbar-title>

        <div v-if="$route.meta.title && !isDevDatabase && !isDevMachine">Cash Keeper</div>
        <div class="dev-mode-notification" v-if="isDevDatabase">DEV DB</div>
        <div class="dev-mode-warning" v-if="!isDevDatabase && isDevMachine">PROD DB in DEV ENV</div>

        <q-btn flat dense round icon="perm_identity">
          <q-menu>
            <q-list style="min-width: 100px">
              <q-item clickable v-close-popup @click="syncClicked">
                <q-item-section>Sync</q-item-section>
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

    <q-drawer class="std-column main-left-sidebar-drawer" v-model="leftDrawerOpen" show-if-above bordered v-if="userStore.isUserLoggedIn">
      <q-list>
        <q-item-label header> CORE </q-item-label>
        <EssentialLink v-for="link in operationList" :key="link.title" v-bind="link" />
      </q-list>

      <q-list>
        <q-item-label header> ENTITIES </q-item-label>
        <EssentialLink v-for="link in entityList" :key="link.title" v-bind="link" />
      </q-list>

      <q-list>
        <q-item-label header> REPORTS </q-item-label>
        <EssentialLink v-for="link in reportList" :key="link.title" v-bind="link" />
      </q-list>

      <q-list>
        <q-item-label header> ACCOUNTING </q-item-label>
        <EssentialLink v-for="link in accountingList" :key="link.title" v-bind="link" />
      </q-list>

      <q-list>
        <q-item-label header> MISC </q-item-label>
        <EssentialLink v-for="link in miscList" :key="link.title" v-bind="link" />
      </q-list>

      <div style="flex: 1"></div>

      <div class="drawer-bottom">
        <div class="app-version">
          <img class="logo" src="icons/android-chrome-192x192.png" alt="CK" />
          <div @click="verionClicked" style="cursor: pointer">
            <div style="font-size: 16px">Cash Keeper</div>
            <div style="font-size: 10px; color: rgb(187, 186, 186)">Version: {{ APP_VERSION }} (Alpha)</div>
          </div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useUserStore } from "src/stores/user";
import EssentialLink from "components/sidebar/EssentialLink.vue";
import { loginService } from "src/services/login-service";
import { dialogService } from "src/services/dialog-service";
import { sleep } from "src/utils/misc-utils";
import { useQuasar } from "quasar";
import SyncDialog from "src/components/SyncDialog.vue";
import { APP_BUILD_DATE, APP_BUILD_VERSION, APP_VERSION } from "src/constants/config-constants";
import { formatService } from "src/services/format-service";

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
    title: "Budgets",
    caption: "Budget and save more",
    icon: "energy_savings_leaf",
    link: "#/budgets",
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
    title: "Debug",
    caption: "",
    icon: "bug_report",
    link: "#/debug",
  },
  {
    title: "About",
    caption: "",
    icon: "contact_support",
    link: "#/about",
  },
];

export default defineComponent({
  name: "MainLayout",

  components: {
    EssentialLink,
  },

  setup() {
    const $q = useQuasar();

    const isLeftDrawerOpen = ref(false);
    const isDevDatabase = ref(false);
    const isDevMachine = ref(false);

    const userStore = useUserStore();

    function checkIfInDevMode() {
      isDevDatabase.value = false;
      isDevMachine.value = false;
      if (userStore.user && userStore.user.domain.indexOf("test") > -1) {
        isDevDatabase.value = true;
      }

      if (window.location.host.indexOf("localhost") > -1 || window.location.host.indexOf("127.0.0.1") > -1) {
        isDevMachine.value = true;
      }
    }
    userStore.$subscribe(checkIfInDevMode);
    checkIfInDevMode();

    async function logoutClicked() {
      let [successful, failureReason] = await loginService.logout();
      if (!successful) {
        await dialogService.alert("Logout Error", failureReason as string);
      }
      await sleep(100);
      // @ts-ignore
      window.location.reload(true);
    }

    async function syncClicked() {
      $q.dialog({ component: SyncDialog, componentProps: { bidirectional: true } });
    }

    async function verionClicked() {
      const title = `Version ${APP_VERSION}`;
      const body = `Internal Build: ${APP_BUILD_VERSION}, Release Date: ${APP_BUILD_DATE}`;
      await dialogService.alert(title, body);
    }

    formatService.init();

    return {
      operationList,
      entityList,
      reportList,
      accountingList,

      leftDrawerOpen: isLeftDrawerOpen,
      toggleLeftDrawer() {
        isLeftDrawerOpen.value = !isLeftDrawerOpen.value;
      },
      APP_VERSION,

      miscList,
      userStore,
      logoutClicked,
      syncClicked,
      verionClicked,

      isDevDatabase,
      isDevMachine,
    };
  },
});
</script>

<style scoped lang="scss">
.drawer-bottom {
  margin-top: 8px;
  background: rgb(29, 29, 29);
  padding: 18px;
  font-size: 12px;
  color: whitesmoke;
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
}

.dev-mode-warning {
  background-color: red;
  color: black;
  padding: 0px 8px;
  font-weight: bold;
}
</style>
