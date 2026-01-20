/*
 * This file (which will be your service worker)
 * is picked up by the build system ONLY if
 * quasar.config.js > pwa > workboxMode is set to "injectManifest"
 *
 * This service worker implements controlled activation to prevent version conflicts.
 * It waits for user confirmation before activating updates, ensuring the current
 * version remains stable while new versions are pre-cached in the background.
 */

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";

// DO NOT use skipWaiting() or clientsClaim() here
// This allows the current service worker to remain active until the user
// explicitly chooses to update, preventing version conflicts during active sessions.

// Use with precache injection
precacheAndRoute(self.__WB_MANIFEST);

cleanupOutdatedCaches();

// Non-SSR fallback to index.html
// Production SSR fallback to offline.html (except for dev)
if (process.env.MODE !== "ssr" || process.env.PROD) {
  registerRoute(
    new NavigationRoute(
      createHandlerBoundToURL(process.env.PWA_FALLBACK_HTML),
      { denylist: [/sw\.js$/, /workbox-(.)*\.js$/] }
    )
  );
}

// Listen for messages from the main thread to activate the new service worker
// This allows controlled activation when the user chooses to update
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    // Only activate when explicitly requested by the user
    self.skipWaiting();
  }
});
