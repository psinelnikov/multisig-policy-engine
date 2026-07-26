import { createPublicClient, http, parseAbi, decodeEventLog, type Log, type Address } from "viem";
import { zgGalileo } from "../app/rpc.js";
import { ZG_RPC_URL, EVALUATION_GATEWAY_ADDR, MULTISIG_WALLET_ADDR, POLL_INTERVAL_MS } from "./config.js";
import { runEvaluation, type EvaluationResult } from "./pipeline.js";
import { submitEvaluation } from "./submit.js";
import { uploadReceipt } from "./storage.js";
import { startReceiptServer } from "./server.js";

const GATEWAY_ABI = parseAbi([
  "event EvaluateRequested(uint256 indexed txId, address indexed sender, bytes encryptedPayload, uint256 nonce)",
]);

const WALLET_ABI = parseAbi([
  "function txCount() view returns (uint256)",
  "function getTransaction(uint256) view returns (address target, bytes data, uint256 value, uint256 nonce, bool executed, bool evaluated, uint8 requiredSigners, uint8 riskScore, uint16 checkResults, uint256 matchedPolicyId, bytes32 storageRoot)",
]);

const EVALUATE_REQUESTED_TOPIC = "0x" + "EvaluateRequested".padStart(64, "0");

const publicClient = createPublicClient({
  chain: zgGalileo,
  transport: http(ZG_RPC_URL),
});

const processedNonces = new Set<string>();
const processedEventTxIds = new Set<bigint>();

/// Find the wallet transaction ID matching a nonce. Searches newest-first.
async function findTxIdByNonce(nonce: bigint): Promise<bigint | null> {
  const count = (await publicClient.readContract({
    address: MULTISIG_WALLET_ADDR as Address,
    abi: WALLET_ABI,
    functionName: "txCount",
  })) as bigint;

  for (let i = count - 1n; i >= 0n; i--) {
    const tx = await publicClient.readContract({
      address: MULTISIG_WALLET_ADDR as Address,
      abi: WALLET_ABI,
      functionName: "getTransaction",
      args: [i],
    });
    if (tx[3] === nonce) return i;
  }
  return null;
}

async function processEvent(log: Log) {
  const decoded = decodeEventLog({
    abi: GATEWAY_ABI,
    data: log.data || "0x",
    topics: log.topics as any,
  });

  const eventTxId = (decoded.args as any).txId as bigint;
  if (processedEventTxIds.has(eventTxId)) return;
  processedEventTxIds.add(eventTxId);

  const encryptedPayload = (decoded.args as any).encryptedPayload as string;
  console.log(`[evaluator] Processing EvaluateRequested #${eventTxId}...`);

  let result: EvaluationResult;
  try {
    result = await runEvaluation(encryptedPayload, processedNonces);
  } catch (err) {
    console.error(`[evaluator] Pipeline failed for #${eventTxId}:`, err instanceof Error ? err.message : err);
    return;
  }

  const txId = await findTxIdByNonce(result.nonce);
  if (txId === null) {
    console.error(`[evaluator] No wallet tx found for nonce ${result.nonce}`);
    return;
  }

  console.log(
    `[evaluator] Submitting evaluation for tx ${txId}: score=${result.riskScore}, ` +
    `signers=${result.requiredSigners}/${result.totalSigners}, policy=${result.policyName}`
  );

  // Upload full receipt to 0G Storage
  const storageRoot = await uploadReceipt({
    txId: txId.toString(),
    nonce: result.nonce.toString(),
    matchedPolicyId: result.matchedPolicyId.toString(),
    policyName: result.policyName,
    riskScore: result.riskScore,
    requiredSigners: result.requiredSigners,
    totalSigners: result.totalSigners,
    checkResults: result.checkResults,
    txValueUsd: result.txValueUsd.toString(),
    aiAnalysis: result.aiAnalysis,
    timestamp: new Date().toISOString(),
  });

  const hash = await submitEvaluation(txId, result, storageRoot as `0x${string}`);
  console.log(`[evaluator] Submitted on-chain: ${hash} (storageRoot: ${storageRoot})`);
}

async function pollLoop() {
  console.log(`[evaluator] Watching ${EVALUATION_GATEWAY_ADDR} for EvaluateRequested events...`);

  let fromBlock = await publicClient.getBlockNumber();

  while (true) {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock > fromBlock) {
        const logs = await publicClient.getLogs({
          address: EVALUATION_GATEWAY_ADDR as Address,
          fromBlock: fromBlock + 1n,
          toBlock: currentBlock,
        });
        for (const log of logs) {
          await processEvent(log);
        }
        fromBlock = currentBlock;
      }
    } catch (err) {
      console.error("[evaluator] Poll error:", err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

pollLoop().catch((err) => {
  console.error("[evaluator] Fatal:", err);
  process.exit(1);
});

startReceiptServer(parseInt(process.env.EVALUATOR_PORT || "3001", 10));
