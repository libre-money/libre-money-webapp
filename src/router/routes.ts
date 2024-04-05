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
        meta: { requiresAuthentication: true, title: "Overview", rememberable: true },
      },
      {
        path: "records",
        name: "records",
        component: () => import("pages/RecordsPage.vue"),
        meta: { requiresAuthentication: true, title: "Records", rememberable: true },
      },
      {
        path: "templates",
        name: "templates",
        component: () => import("pages/TemplatesPage.vue"),
        meta: { requiresAuthentication: true, title: "Templates", rememberable: true },
      },
      {
        path: "wallets",
        name: "wallets",
        component: () => import("pages/WalletsPage.vue"),
        meta: { requiresAuthentication: true, title: "Wallets", rememberable: true },
      },
      {
        path: "assets",
        name: "assets",
        component: () => import("pages/AssetsPage.vue"),
        meta: { requiresAuthentication: true, title: "Assets", rememberable: true },
      },
      {
        path: "loans-and-debts",
        name: "loans-and-debts",
        component: () => import("pages/LoansAndDebtsPage.vue"),
        meta: { requiresAuthentication: true, title: "Loans & Debts", rememberable: true },
      },
      {
        path: "budgets",
        name: "budgets",
        component: () => import("pages/BudgetsPage.vue"),
        meta: { requiresAuthentication: true, title: "Budgets", rememberable: true },
      },
      // --- Entities:
      {
        path: "parties",
        name: "parties",
        component: () => import("pages/PartiesPage.vue"),
        meta: { requiresAuthentication: true, title: "Parties & Vendors", rememberable: true },
      },
      {
        path: "tags",
        name: "tags",
        component: () => import("pages/TagsPage.vue"),
        meta: { requiresAuthentication: true, title: "Tags", rememberable: true },
      },
      {
        path: "expense-avenues",
        name: "expense-avenues",
        component: () => import("pages/ExpenseAvenuesPage.vue"),
        meta: { requiresAuthentication: true, title: "Expense Avenues", rememberable: true },
      },
      {
        path: "income-sources",
        name: "income-sources",
        component: () => import("pages/IncomeSourcesPage.vue"),
        meta: { requiresAuthentication: true, title: "Income Sources", rememberable: true },
      },
      {
        path: "currencies",
        name: "currencies",
        component: () => import("pages/CurrenciesPage.vue"),
        meta: { requiresAuthentication: true, title: "Currencies", rememberable: true },
      },
      // --- Entities:
      {
        path: "combined-report",
        name: "combined-report",
        component: () => import("pages/CombinedReportPage.vue"),
        meta: { requiresAuthentication: true, title: "Combined Report", rememberable: true },
      },
      // --- Misc:
      {
        path: "memos",
        name: "memos",
        component: () => import("pages/MemosPage.vue"),
        meta: { requiresAuthentication: true, title: "Memos", rememberable: true },
      },
      {
        path: "settings",
        name: "settings",
        component: () => import("pages/SettingsPage.vue"),
        meta: { requiresAuthentication: true, title: "Settings", rememberable: true },
      },
      {
        path: "debug",
        name: "debug",
        component: () => import("pages/DebugPage.vue"),
        meta: { requiresAuthentication: true, title: "Debug", rememberable: true },
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
