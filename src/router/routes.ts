import { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        component: () => import("pages/OverviewPage.vue"),
        meta: { requiresAuthentication: true, title: null },
      },
      {
        path: "login",
        name: "login",
        component: () => import("pages/LoginPage.vue"),
        meta: { requiresAuthentication: false, title: null },
      },
      // --- Core:
      {
        path: "overview",
        name: "overview",
        component: () => import("pages/OverviewPage.vue"),
        meta: { requiresAuthentication: true, title: "Overview" },
      },
      {
        path: "records",
        name: "records",
        component: () => import("pages/RecordsPage.vue"),
        meta: { requiresAuthentication: true, title: "Records" },
      },
      {
        path: "wallets",
        name: "wallets",
        component: () => import("pages/WalletsPage.vue"),
        meta: { requiresAuthentication: true, title: "Wallets" },
      },
      {
        path: "loans-and-debts",
        name: "loans-and-debts",
        component: () => import("pages/LoansAndDebtsPage.vue"),
        meta: { requiresAuthentication: true, title: "Loans & Debts" },
      },
      {
        path: "assets",
        name: "assets",
        component: () => import("pages/AssetsPage.vue"),
        meta: { requiresAuthentication: true, title: "Assets" },
      },
      // --- Entities:
      {
        path: "parties",
        name: "parties",
        component: () => import("pages/PartiesPage.vue"),
        meta: { requiresAuthentication: true, title: "Parties & Vendors" },
      },
      {
        path: "tags",
        name: "tags",
        component: () => import("pages/TagsPage.vue"),
        meta: { requiresAuthentication: true, title: "Tags" },
      },
      {
        path: "expense-avenues",
        name: "expense-avenues",
        component: () => import("pages/ExpenseAvenuesPage.vue"),
        meta: { requiresAuthentication: true, title: "Expense Avenues" },
      },
      {
        path: "income-sources",
        name: "income-sources",
        component: () => import("pages/IncomeSourcesPage.vue"),
        meta: { requiresAuthentication: true, title: "Income Sources" },
      },
      {
        path: "currencies",
        name: "currencies",
        component: () => import("pages/CurrenciesPage.vue"),
        meta: { requiresAuthentication: true, title: "Currencies" },
      },
      // --- Entities:
      {
        path: "combined-report",
        name: "combined-report",
        component: () => import("pages/CombinedReportPage.vue"),
        meta: { requiresAuthentication: true, title: "Combined Report" },
      },
      // --- Debug:
      {
        path: "debug",
        name: "debug",
        component: () => import("pages/DebugPage.vue"),
        meta: { requiresAuthentication: true, title: "Debug" },
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
    meta: { requiresAuthentication: false },
  },
];

export default routes;
