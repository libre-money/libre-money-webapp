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
        <q-item-label header> MISC </q-item-label>
        <EssentialLink v-for="link in miscList" :key="link.title" v-bind="link" />
      </q-list>

      <div style="flex: 1"></div>

      <div class="drawer-bottom">
        <div class="app-version">Cash Keeper {{ appVersion }}</div>
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

    return {
      operationList,
      entityList,
      reportList,

      leftDrawerOpen: isLeftDrawerOpen,
      toggleLeftDrawer() {
        isLeftDrawerOpen.value = !isLeftDrawerOpen.value;
      },
      appVersion: "ver 0.0.1 (POC)",
      miscList,
      userStore,
      logoutClicked,
      syncClicked,
    };
  },
});
</script>

<style scoped lang="scss">
.drawer-bottom {
  background: rgb(29, 29, 29);
  padding: 18px;
  font-size: 12px;
  color: whitesmoke;
}
</style>
