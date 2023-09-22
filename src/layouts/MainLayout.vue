<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated v-if="userStore.isUserLoggedIn">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          {{ $route.meta.title || "Cash Keeper" }}
        </q-toolbar-title>

        <div v-if="$route.meta.title">Cash Keeper</div>
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
        <div class="app-version">{{ appVersion }}</div>
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

const operationList = [
  {
    title: "Overview",
    caption: "Summaries of everything",
    icon: "money",
    link: "#/overview",
  },
  {
    title: "Records",
    caption: "Income, Expenses and everything else",
    icon: "money",
    link: "#/records",
  },
  {
    title: "Loans & Debts",
    caption: "Receivables and Payables",
    icon: "money",
    link: "#/loans-and-debts",
  },
  {
    title: "Wallets",
    caption: "Cash, Bank and Digital Money",
    icon: "money",
    link: "#/wallets",
  },
  {
    title: "Assets",
    caption: "Properties and Valuables",
    icon: "money",
    link: "#/assets",
  },
];

const entityList = [
  {
    title: "Parties & Vendors",
    caption: "",
    icon: "school",
    link: "#/parties",
  },
  {
    title: "Tags",
    caption: "",
    icon: "school",
    link: "#/tags",
  },
  {
    title: "Income Sources",
    caption: "",
    icon: "school",
    link: "#/income-sources",
  },
  {
    title: "Expense Avenues",
    caption: "",
    icon: "school",
    link: "#/expense-avenues",
  },
  {
    title: "Currencies",
    caption: "",
    icon: "school",
    link: "#/currencies",
  },
];

const reportList = [
  {
    title: "Monthly Report",
    caption: "",
    icon: "school",
    link: "#/report/monthly",
  },
];

const miscList = [
  {
    title: "Debug",
    caption: "",
    icon: "school",
    link: "#/debug",
  },
];

export default defineComponent({
  name: "MainLayout",

  components: {
    EssentialLink,
  },

  setup() {
    const isLeftDrawerOpen = ref(false);

    const userStore = useUserStore();

    return {
      operationList,
      entityList,
      reportList,

      leftDrawerOpen: isLeftDrawerOpen,
      toggleLeftDrawer() {
        isLeftDrawerOpen.value = !isLeftDrawerOpen.value;
      },
      appVersion: "v0.0.1 (POC)",
      miscList,
      userStore,
    };
  },
});
</script>

<style scoped lang="scss">
.drawer-bottom {
  background: #ececec;
  padding: 12px;
  font-size: 12px;
}
</style>
