export const ZG_RPC_URL = process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai";
export const ZG_CHAIN_ID = 16602;
export const ZG_STORAGE_INDEXER_URL =
  process.env.ZG_STORAGE_INDEXER_URL || "https://indexer-storage-testnet-turbo.0g.ai";

export const EVALUATION_GATEWAY_ADDR = (process.env.EVALUATION_GATEWAY_ADDR || "") as `0x${string}`;
export const MULTISIG_WALLET_ADDR = (process.env.MULTISIG_WALLET_ADDR || "") as `0x${string}`;
export const POLICY_REGISTRY_ADDR = (process.env.POLICY_REGISTRY_ADDR || "") as `0x${string}`;

export const EVALUATOR_PRIVATE_KEY = process.env.EVALUATOR_PRIVATE_KEY || "";
export const ZG_COMPUTE_PROVIDER = process.env.ZG_COMPUTE_PROVIDER || "";

export const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6383";

export const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "3000", 10);
