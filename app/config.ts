export const VERSION = "0.1.0";

// ponytail: legacy op type constants (kept for app/index.ts compat)
export const OP_TYPE_EVALUATE = "EVALUATE_RISK";
export const OP_COMMAND_DEFAULT = "";

export const POLICY_REGISTRY_ADDR = process.env.POLICY_REGISTRY_ADDR || "";
export const AUDIT_LOG_ADDR = process.env.AUDIT_LOG_ADDR || "";
export const MULTISIG_WALLET_ADDR = process.env.MULTISIG_WALLET_ADDR || "";

export const ZG_RPC_URL = process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai";
export const ZG_CHAIN_ID = 16602;

export const EXPLORER_API_URL =
  process.env.ZG_EXPLORER_API_URL || "https://chainscan-galileo.0g.ai/open/api";

export const ERC7730_REGISTRY_BASE =
  "https://raw.githubusercontent.com/LedgerHQ/clear-signing-erc7730-registry/master/registry";

export const COINGECKO_API_URL =
  process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";

export const EVALUATION_GATEWAY_ADDR = process.env.EVALUATION_GATEWAY_ADDR || "";
export const EVALUATOR_PRIVATE_KEY = process.env.EVALUATOR_PRIVATE_KEY || "";
export const ZG_COMPUTE_PROVIDER = process.env.ZG_COMPUTE_PROVIDER || "";

// ponytail: legacy port for the old TEE decrypt path (unused by evaluator, kept for compat)
export const SIGN_PORT = parseInt(process.env.SIGN_PORT || "6661", 10);
