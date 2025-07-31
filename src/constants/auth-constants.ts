export const DEFAULT_REMOTE_SERVER_URL = "https://homeserver.cashkeeper.space";

export type ServerOption = {
  label: string;
  value: string;
};

export const serverOptions: ServerOption[] = [
  { label: "Cash Keeper (Cluster 1)", value: "cluster-1" },
  { label: "Cash Keeper (Cluster 2)", value: "cluster-2" },
  { label: "Self Hosted", value: "self-hosted" },
];

export const OFFLINE_DOMAIN = "offline";
