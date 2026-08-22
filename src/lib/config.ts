export const APP_NAME = "Shohub";
export const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || "shohub.app";
export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "";
export const SHELBY_API_KEY = import.meta.env.VITE_SHELBY_API_KEY || "";
export const SHELBY_RPC_URL =
  import.meta.env.VITE_SHELBY_RPC_URL || "https://api.shelbynet.shelby.xyz/shelby";
export const SHELBY_CHAIN_ID = Number(import.meta.env.VITE_SHELBY_CHAIN_ID || 118);
export const REGISTRY_ADDRESS = import.meta.env.VITE_SHELBY_REGISTRY_ADDRESS || "";
export const SHELBY_BLOB_BASE_URL = "https://api.shelbynet.shelby.xyz/shelby/v1/blobs";

export const MAX_COVER_BYTES = 12 * 1024 * 1024;
export const MAX_MEDIA_BYTES = 150 * 1024 * 1024;

export const isConfigured = () => Boolean(PRIVY_APP_ID && SHELBY_API_KEY && REGISTRY_ADDRESS);
