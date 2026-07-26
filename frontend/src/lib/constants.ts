export const ZG_GALILEO_CHAIN = {
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: ["/rpc"] },
  },
  blockExplorers: {
    default: {
      name: "0G Chainscan Galileo",
      url: "https://chainscan-galileo.0g.ai",
    },
  },
} as const;

export const GALILEO_GAS_PRICE = 4000000000n;

export const CONTRACTS = {
  walletFactory: import.meta.env.VITE_WALLET_FACTORY_ADDR as `0x${string}`,
  governanceMultisig: import.meta.env.VITE_GOVERNANCE_MULTISIG_ADDR as `0x${string}`,
  policyRegistry: import.meta.env.VITE_POLICY_REGISTRY_ADDR as `0x${string}`,
  auditLog: import.meta.env.VITE_AUDIT_LOG_ADDR as `0x${string}`,
  multisigWallet: import.meta.env.VITE_MULTISIG_WALLET_ADDR as `0x${string}`,
  presetPolicyRegistry: import.meta.env.VITE_PRESET_POLICY_REGISTRY_ADDR as `0x${string}`,
  evaluationGateway: import.meta.env.VITE_EVALUATION_GATEWAY_ADDR as `0x${string}`,
  testToken: import.meta.env.VITE_TEST_TOKEN_ADDR as `0x${string}`,
} as const;

// Validate addresses to prevent burn address usage
export function validateAddress(address: string | undefined): address is `0x${string}` {
  return !!address && address !== "0x0000000000000000000000000000000000000000" && address.startsWith("0x") && address.length === 42;
}

export const PRESET_DESCRIPTIONS: Record<number, string> = {
  0: "Auto-approve transfers under $1,000. Low friction for everyday operations. Requires 1 signer.",
  1: "High-Value Transfers over $1,000 USDC. Requires multi-sig approval with 2 signers and medium risk checks.",
  2: "Very High Value transfers over $50K. Requires verified contracts and 3 signers for admin-level approval.",
  3: "Interact with whitelisted DeFi protocols. Moderate limits with balanced security requiring 2 signers.",
};

export const CHECK_LABELS: Record<number, string> = {
  0: "Allowlist",
  1: "Denylist",
  2: "Verification",
  3: "ERC-7730",
  4: "Per-Tx Limit",
  5: "Daily Limit",
  6: "Bytecode",
  7: "Contract Age",
  8: "Tx Volume",
  9: "Calldata",
  10: "AI Analysis",
};

export function riskColor(score: number): string {
  if (score <= 25) return "var(--green)";
  if (score <= 50) return "var(--accent)";
  if (score <= 75) return "#f97316";
  return "var(--red)";
}

export function riskLabel(score: number): string {
  if (score <= 25) return "Low";
  if (score <= 50) return "Medium";
  if (score <= 75) return "High";
  return "Critical";
}

export function decodeCheckResults(bitmap: number): { bit: number; label: string; pass: boolean }[] {
  const results: { bit: number; label: string; pass: boolean }[] = [];
  for (let i = 0; i <= 10; i++) {
    results.push({
      bit: i,
      label: CHECK_LABELS[i] || `Check ${i}`,
      pass: (bitmap & (1 << i)) !== 0,
    });
  }
  return results;
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatTimestamp(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString();
}

export function explorerUrl(addr: string): string {
  return `https://chainscan-galileo.0g.ai/address/${addr}`;
}

export function formatUsd(val: bigint): string {
  const num = Number(val) / 1e18;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
}
