import { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        component: () => import("pages/IndexPage.vue"),
        meta: { requiresAuthentication: true },
      },
      {
        path: "login",
        name: "login",
        component: () => import("pages/LoginPage.vue"),
        meta: { requiresAuthentication: false },
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
