import { register } from "register-service-worker";
import { Notify } from "quasar";

// The ready(), registered(), cached(), updatefound() and updated()
// events passes a ServiceWorkerRegistration instance in their arguments.
// ServiceWorkerRegistration: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

// Track update state to prevent duplicate notifications
let updateAvailable = false;
let notificationShown = false;
let completionToastShown = false;
let registration: ServiceWorkerRegistration | null = null;
let waitingWorker: ServiceWorker | null = null;
// Track if we explicitly activated an update (user clicked "Update Now")
let updateActivationInProgress = false;

// Function to activate the waiting service worker and reload
async function activateUpdate() {
  if (waitingWorker) {
    // Mark that we're explicitly activating the update
    updateActivationInProgress = true;

    // Tell the waiting service worker to skip waiting and activate
    waitingWorker.postMessage({ type: "SKIP_WAITING" });

    // Wait a moment for the service worker to activate
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Reload the page to use the new version
    window.location.reload();
  }
}

// Function to show update notification
function showUpdateNotification() {
  if (updateAvailable && !notificationShown) {
    notificationShown = true;
    Notify.create({
      message: "A new version is available",
      caption: "Click to update now, or it will update on next reload",
      color: "info",
      textColor: "white",
      icon: "system_update",
      position: "top",
      timeout: 0, // Don't auto-dismiss
      actions: [
        {
          label: "Update Now",
          color: "white",
          handler: () => {
            activateUpdate();
          },
        },
        {
          label: "Later",
          color: "white",
          handler: () => {
            // User can continue using current version
            // Update will happen on next page reload
          },
        },
      ],
    });
  }
}

register(process.env.SERVICE_WORKER_FILE, {
  // The registrationOptions object will be passed as the second argument
  // to ServiceWorkerContainer.register()
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#Parameter

  // registrationOptions: { scope: './' },

  ready(reg) {
    console.log("Service worker is active and ready.");
    registration = reg;

    // Check for updates periodically (every hour)
    setInterval(() => {
      if (registration) {
        registration.update();
      }
    }, 60 * 60 * 1000);
  },

  registered(reg) {
    console.log("Service worker has been registered.");
    registration = reg;
  },

  cached(/* registration */) {
    console.log("Content has been cached for offline use.");
  },

  updatefound(reg) {
    console.log("New content is downloading.");

    // Check if there's a waiting service worker
    if (reg.waiting) {
      waitingWorker = reg.waiting;
      updateAvailable = true;
      showUpdateNotification();
    }

    // Listen for the new service worker to finish installing
    reg.installing?.addEventListener("statechange", () => {
      if (reg.installing?.state === "installed" && navigator.serviceWorker.controller) {
        // New service worker is installed and waiting
        waitingWorker = reg.waiting;
        updateAvailable = true;

        // Show completion toast notification (self-dismissing)
        if (!completionToastShown) {
          completionToastShown = true;
          Notify.create({
            message: "Update downloaded and ready",
            caption: "Click the notification above to update now",
            color: "positive",
            textColor: "white",
            icon: "download_done",
            position: "top",
            timeout: 5000, // Auto-dismiss after 5 seconds
          });
        }

        showUpdateNotification();
      }
    });
  },

  updated(reg) {
    console.log("New content is available.");

    // If there's a waiting worker, store it and show notification
    if (reg.waiting) {
      waitingWorker = reg.waiting;
      updateAvailable = true;

      // Show completion toast notification (self-dismissing) if we haven't already
      if (!completionToastShown) {
        completionToastShown = true;
        Notify.create({
          message: "Update downloaded and ready",
          caption: "Click the notification above to update now",
          color: "positive",
          textColor: "white",
          icon: "download_done",
          position: "top",
          timeout: 5000, // Auto-dismiss after 5 seconds
        });
      }

      showUpdateNotification();
    }
  },

  offline() {
    console.log("No internet connection found. App is running in offline mode.");
    Notify.create({
      message: "You are offline",
      color: "warning",
      textColor: "white",
      icon: "cloud_off",
      position: "top",
      timeout: 3000,
    });
  },

  error(err) {
    console.error("Error during service worker registration:", err);
    // Don't show error to user unless it's critical
    // Most errors are non-fatal (e.g., service worker not supported)
  },
});

// Also listen for controllerchange to handle updates that happen
// when the user navigates to a new page or after manual activation
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Only reload if we explicitly activated the update (user clicked "Update Now")
    // This prevents automatic reloads when the service worker changes for other reasons
    if (updateActivationInProgress) {
      // Reset flags to prevent multiple reloads
      updateActivationInProgress = false;
      updateAvailable = false;
      waitingWorker = null;
      // Reload to use the new service worker version
      window.location.reload();
    }
    // If updateActivationInProgress is false, it means:
    // - The service worker changed for a different reason (not our explicit activation)
    // - The user hasn't chosen to update yet
    // - We should NOT reload automatically
  });
}
