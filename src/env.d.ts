/* eslint-disable */

/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: "hash" | "history" | "abstract" | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_GO_ONLINE_REGISTRATION_URL: string;
    readonly VITE_GO_ONLINE_SELF_HOST_URL: string;
    readonly VITE_DEMO_PREPARATION_ENABLED: string;
    readonly VITE_AUTH_SERVER_URL: string;
  }
}
