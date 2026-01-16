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
      {
        path: "post-logout",
        name: "post-logout",
        component: () => import("pages/PostLogoutPage.vue"),
        meta: { requiresAuthentication: false, title: null },
      },
      {
        path: "offline-onboarding",
        name: "offline-onboarding",
        component: () => import("pages/OfflineOnboardingPage.vue"),
        meta: { requiresAuthentication: false, title: null },
      },
      {
        path: "demo-onboarding",
        name: "demo-onboarding",
        component: () => import("pages/DemoOnboardingPage.vue"),
        meta: { requiresAuthentication: false, title: null },
      },
      {
        path: "go-online",
        name: "go-online",
        component: () => import("pages/GoOnlinePage.vue"),
        meta: { requiresAuthentication: true, title: "Go Online" },
      },
      {
        path: "get-account",
        name: "get-account",
        component: () => import("pages/GetAccountPage.vue"),
        meta: { requiresAuthentication: true, title: "Get Your Account" },
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
        path: "pro-mode",
        name: "pro-mode",
        component: () => import("pages/ProModePage.vue"),
        meta: { requiresAuthentication: true, title: "Pro Mode", rememberable: true, preferLeftDrawerClosed: true },
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
        path: "rolling-budgets",
        name: "rolling-budgets",
        component: () => import("pages/RollingBudgetsPage.vue"),
        meta: { requiresAuthentication: true, title: "Rolling Budgets", rememberable: true },
      },
      {
        path: "budget-analysis",
        name: "budget-analysis",
        component: () => import("pages/BudgetAnalysisPage.vue"),
        meta: { requiresAuthentication: true, title: "Budget Analysis", rememberable: true },
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
      {
        path: "text-import-rules",
        name: "text-import-rules",
        component: () => import("pages/TextImportRulesPage.vue"),
        meta: { requiresAuthentication: true, title: "Text Import Rules", rememberable: true },
      },
      // --- Reports:
      {
        path: "combined-report",
        name: "combined-report",
        component: () => import("pages/CombinedReportPage.vue"),
        meta: { requiresAuthentication: true, title: "Combined Report", rememberable: true },
      },
      // --- Accounting:
      {
        path: "accounting/journal",
        name: "acc-journal",
        component: () => import("pages/AccJournalPage.vue"),
        meta: { requiresAuthentication: true, title: "Journal", rememberable: true },
      },
      {
        path: "accounting/accounts",
        name: "acc-accounts",
        component: () => import("pages/AccAccountsPage.vue"),
        meta: { requiresAuthentication: true, title: "Accounts", rememberable: true },
      },
      {
        path: "accounting/ledger/:accountCode",
        name: "acc-ledger",
        component: () => import("pages/AccLedgerPage.vue"),
        meta: { requiresAuthentication: true, title: "Ledger", rememberable: false },
      },
      {
        path: "accounting/trial-balance",
        name: "acc-trial-balance",
        component: () => import("pages/AccTrialBalancePage.vue"),
        meta: { requiresAuthentication: true, title: "Trial Balance", rememberable: true },
      },
      {
        path: "accounting/income-statement",
        name: "acc-income-statement",
        component: () => import("pages/AccIncomeStatementPage.vue"),
        meta: { requiresAuthentication: true, title: "Income Statement", rememberable: true },
      },
      {
        path: "accounting/balance-sheet",
        name: "acc-balance-sheet",
        component: () => import("pages/AccBalanceSheetPage.vue"),
        meta: { requiresAuthentication: true, title: "Balance Sheet", rememberable: true },
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
      {
        path: "audit-log",
        name: "audit-log",
        component: () => import("pages/AuditLogPage.vue"),
        meta: { requiresAuthentication: true, title: "Audit Log", rememberable: true },
      },
      {
        path: "about",
        name: "about",
        component: () => import("pages/AboutPage.vue"),
        meta: { requiresAuthentication: false, title: "About", rememberable: false },
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
