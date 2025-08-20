import { throwMissingEnvironmentVariable } from "src/utils/misc-utils";

export const PROMISE_POOL_CONCURRENCY_LIMT = 10;
export const APP_VERSION = "0.3.4";
export const APP_BUILD_VERSION = "DEV_BUILD";
export const APP_BUILD_DATE = "NOT_APPLICABLE";
export const RECORD_BATCH_PROCESSING_OPTIMIZATION_THRESHOLD = 200;
export const UNBUDGETED_RECORDS_BUDGET_NAME = "Unbudgeted";

// Type assertion for Vite environment variables
const env = (import.meta as any).env;

export const GO_ONLINE_REGISTRATION_URL = env.VITE_GO_ONLINE_REGISTRATION_URL || throwMissingEnvironmentVariable("VITE_GO_ONLINE_REGISTRATION_URL");
export const GO_ONLINE_SELF_HOST_URL = env.VITE_GO_ONLINE_SELF_HOST_URL || throwMissingEnvironmentVariable("VITE_GO_ONLINE_SELF_HOST_URL");

// Demo preparation feature flag
export const DEMO_PREPARATION_ENABLED = env.VITE_DEMO_PREPARATION_ENABLED === "true";
