<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated v-if="userStore.isUserLoggedIn">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          {{ $route.meta.title || "Cash Keeper" }}
        </q-toolbar-title>

        <div v-if="$route.meta.title">Cash Keeper</div>

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

    <q-drawer class="std-column main-left-sidebar-drawer" v-model="leftDrawerOpen" show-if-above bordered
      v-if="userStore.isUserLoggedIn">
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
        <q-item-label header> MISC </q-item-label>
        <EssentialLink v-for="link in miscList" :key="link.title" v-bind="link" />
      </q-list>

      <div style="flex: 1"></div>

      <div class="drawer-bottom">
        <div class="app-version">
          <img class="logo" src="icons/android-chrome-192x192.png" alt="CK" />
          <div @click="verionClicked" style="cursor: pointer">
            <div style="font-size: 16px">Cash Keeper</div>
            <div style="font-size: 10px; color: rgb(187, 186, 186)">Version: {{ appVersion }} (Alpha)</div>
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
];

export default defineComponent({
  name: "MainLayout",

  components: {
    EssentialLink,
  },

  setup() {
    const $q = useQuasar();

    const isLeftDrawerOpen = ref(false);

    const userStore = useUserStore();

    const appVersion = "0.1.4";
    const internalBuild = "DEV_BUILD";
    const buildDate = "NOT_APPLICABLE";

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
      const title = `Version ${appVersion}`;
      const body = `Internal Build: ${internalBuild}, Release Date: ${buildDate}`;
      await dialogService.alert(title, body);
    }

    return {
      operationList,
      entityList,
      reportList,

      leftDrawerOpen: isLeftDrawerOpen,
      toggleLeftDrawer() {
        isLeftDrawerOpen.value = !isLeftDrawerOpen.value;
      },
      appVersion,
      internalBuild,
      buildDate,
      miscList,
      userStore,
      logoutClicked,
      syncClicked,
      verionClicked,
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
</style>
