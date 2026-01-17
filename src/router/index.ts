import { route } from "quasar/wrappers";
import { createMemoryHistory, createRouter, createWebHashHistory, createWebHistory } from "vue-router";

import routes from "./routes";
import { useUserStore } from "src/stores/user";
import { useSettingsStore } from "src/stores/settings";
import { dialogService } from "src/services/dialog-service";
import { sleep } from "src/utils/misc-utils";

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER ? createMemoryHistory : process.env.VUE_ROUTER_MODE === "history" ? createWebHistory : createWebHashHistory;

  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  router.beforeEach((to, from, next) => {
    console.debug("Navigation", { to, from });
    const settingsStore = useSettingsStore();

    if (from.fullPath === "/" && to.fullPath === "/") {
      const noNavAway = to.query?.noNavAway === "true";
      if (settingsStore.rememberLastOpenedView && !noNavAway) {
        return next({ path: settingsStore.lastOpenedView });
      } else {
        return next({ name: settingsStore.defaultView });
      }
    }

    const userStore = useUserStore();
    const isUserLoggedIn = userStore.isUserLoggedIn;
    const currentUser = userStore.currentUser;

    // Redirect logged-in users away from the login page
    if (isUserLoggedIn && to.name === "login") {
      return next({ path: "/" });
    }

    // If user exists but is not offline/demo and initial sync is not complete, redirect to initial-sync
    // (unless they're already on the initial-sync page)
    if (
      currentUser &&
      !currentUser.isOfflineUser &&
      !currentUser.isDemoUser &&
      currentUser.isInitialSyncComplete !== true &&
      to.name !== "initial-sync" &&
      to.name !== "login" &&
      to.name !== "post-logout"
    ) {
      return next({ name: "initial-sync" });
    }

    // Allow access to initial-sync page only if user needs it
    if (to.name === "initial-sync") {
      if (!currentUser) {
        return next({ name: "login" });
      }
      if (currentUser.isOfflineUser || currentUser.isDemoUser) {
        return next({ name: "overview" });
      }
      if (currentUser.isInitialSyncComplete === true) {
        return next({ name: "overview" });
      }
    }

    const doesRouteRequireAuthentication = to.matched.some((record) => record.meta.requiresAuthentication);
    if (doesRouteRequireAuthentication && !isUserLoggedIn) {
      return next({ name: "login", query: { next: to.fullPath } });
    } else {
      if (to.meta?.rememberable) {
        settingsStore.setLastOpenedView(to.fullPath);
      }
      return next();
    }
  });

  router.onError(async (error, to, from) => {
    console.error(error);
    if (to.fullPath === "/") {
      return;
    }
    await dialogService.alert("Unexpected error", "We have encountered an unexpected error. Navigating to the home page.");
    try {
      return await router.push({ path: "/", query: { noNavAway: "true" } });
    } catch (error) {
      console.error(error);
      window.location.href = "/";
      await sleep(1000);
      // @ts-ignore
      window.location.reload(true);
    }
  });

  return router;
});
