/**
 * Service for managing service worker updates and cache operations
 * Provides utilities for checking update availability, activating updates,
 * and emergency cleanup operations.
 */

export interface ServiceWorkerUpdateStatus {
  updateAvailable: boolean;
  waitingWorker: ServiceWorker | null;
  registration: ServiceWorkerRegistration | null;
}

class ServiceWorkerService {
  /**
   * Check if a service worker update is available
   */
  async checkForUpdate(): Promise<ServiceWorkerUpdateStatus> {
    if (!("serviceWorker" in navigator)) {
      return {
        updateAvailable: false,
        waitingWorker: null,
        registration: null,
      };
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return {
          updateAvailable: false,
          waitingWorker: null,
          registration: null,
        };
      }

      // Check if there's a waiting service worker
      const waitingWorker = registration.waiting;
      const updateAvailable = waitingWorker !== null;

      return {
        updateAvailable,
        waitingWorker,
        registration,
      };
    } catch (error) {
      console.error("Error checking for service worker update:", error);
      return {
        updateAvailable: false,
        waitingWorker: null,
        registration: null,
      };
    }
  }

  /**
   * Force check for updates by calling update() on the registration
   */
  async forceCheckForUpdate(): Promise<ServiceWorkerUpdateStatus> {
    if (!("serviceWorker" in navigator)) {
      return {
        updateAvailable: false,
        waitingWorker: null,
        registration: null,
      };
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return {
          updateAvailable: false,
          waitingWorker: null,
          registration: null,
        };
      }

      // Force update check
      await registration.update();

      // Wait a bit for the update to be detected
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check again for waiting worker
      const waitingWorker = registration.waiting;
      const updateAvailable = waitingWorker !== null;

      return {
        updateAvailable,
        waitingWorker,
        registration,
      };
    } catch (error) {
      console.error("Error forcing service worker update check:", error);
      return {
        updateAvailable: false,
        waitingWorker: null,
        registration: null,
      };
    }
  }

  /**
   * Activate a waiting service worker update
   */
  async activateUpdate(): Promise<void> {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported");
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error("No service worker registration found");
    }

    const waitingWorker = registration.waiting;
    if (!waitingWorker) {
      throw new Error("No waiting service worker found");
    }

    // Send message to activate the waiting service worker
    waitingWorker.postMessage({ type: "SKIP_WAITING" });

    // Wait for the service worker to activate
    await new Promise<void>((resolve) => {
      const controllerChangeHandler = () => {
        navigator.serviceWorker.removeEventListener("controllerchange", controllerChangeHandler);
        resolve();
      };
      navigator.serviceWorker.addEventListener("controllerchange", controllerChangeHandler);

      // Timeout after 5 seconds
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener("controllerchange", controllerChangeHandler);
        resolve();
      }, 5000);
    });
  }

  /**
   * Delete all caches
   */
  async clearAllCaches(): Promise<void> {
    if (!("caches" in window)) {
      return;
    }

    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }

  /**
   * Unregister all service workers
   */
  async unregisterAllServiceWorkers(): Promise<void> {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  /**
   * Emergency cleanup: clear all caches and unregister all service workers
   */
  async emergencyCleanup(): Promise<void> {
    await this.clearAllCaches();
    await this.unregisterAllServiceWorkers();
  }
}

export const serviceWorkerService = new ServiceWorkerService();
