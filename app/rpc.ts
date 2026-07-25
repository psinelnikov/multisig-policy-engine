import { createPublicClient, http } from "viem";
import { defineChain } from "viem";
import { ZG_RPC_URL, ZG_CHAIN_ID, POLICY_REGISTRY_ADDR } from "./config.js";

const zgGalileo = defineChain({
  id: ZG_CHAIN_ID,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: [ZG_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "0G Chainscan Galileo", url: "https://chainscan-galileo.0g.ai" },
  },
});

const POLICY_REGISTRY_ABI = [
  {
    name: "getActivePolicies",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "name", type: "string" },
          { name: "active", type: "bool" },
          {
            name: "conditions",
            type: "tuple",
            components: [
              { name: "targetAddresses", type: "address[]" },
              { name: "functionSelectors", type: "bytes4[]" },
              { name: "minValue", type: "uint256" },
              { name: "maxValue", type: "uint256" },
              { name: "timeWindowStart", type: "uint256" },
              { name: "timeWindowEnd", type: "uint256" },
              { name: "requireVerified", type: "bool" },
              { name: "requireErc7730", type: "bool" },
            ],
          },
          {
            name: "limits",
            type: "tuple",
            components: [
              { name: "maxValuePerTxUsd", type: "uint256" },
              { name: "maxValueDailyUsd", type: "uint256" },
              { name: "allowlist", type: "address[]" },
              { name: "denylist", type: "address[]" },
            ],
          },
          { name: "signers", type: "address[]" },
          { name: "riskWeight", type: "uint8" },
          { name: "createdAt", type: "uint256" },
          { name: "updatedAt", type: "uint256" },
        ],
      },
    ],
  },
] as const;

const client = createPublicClient({
  chain: zgGalileo,
  transport: http(ZG_RPC_URL),
});

export async function fetchActivePolicies(): Promise<any[]> {
  if (!POLICY_REGISTRY_ADDR) {
    throw new Error("POLICY_REGISTRY_ADDR not set");
  }
  const result = await client.readContract({
    address: POLICY_REGISTRY_ADDR as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: "getActivePolicies",
  });
  return result as any[];
}

export async function getCurrentBlockTimestamp(): Promise<bigint> {
  const block = await client.getBlock();
  return block.timestamp;
}

export async function getEthCode(address: `0x${string}`, blockTag?: bigint): Promise<string> {
  const code = await client.getCode({ address, blockNumber: blockTag });
  return code || "0x";
}

export async function getBlockNumber(): Promise<bigint> {
  return client.getBlockNumber();
}

export async function getTransactionCount(address: `0x${string}`): Promise<number> {
  const nonce = await client.getTransactionCount({ address });
  return nonce;
}

export { client, zgGalileo };
