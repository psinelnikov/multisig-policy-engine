import { decodeAbiParameters, parseAbiParameters, type Address } from "viem";
import { decryptPayload } from "./decrypt.js";
import { bytesToHex } from "../base/utils.js";
import { fetchActivePolicies, getCurrentBlockTimestamp } from "../app/rpc.js";
import { matchesConditions, mapScoreToThreshold, today } from "../app/policy_matcher.js";
import { runSimulation, computeScore } from "../app/simulation.js";
import { fetchNativePrice } from "../app/checks/oracle.js";
import type { EvaluateRequest } from "../app/types.js";
import { EVALUATOR_PRIVATE_KEY } from "./config.js";

export interface EvaluationResult {
  matchedPolicyId: bigint;
  policyName: string;
  riskScore: number;
  requiredSigners: number;
  totalSigners: number;
  signers: Address[];
  checkResults: number;
  policiesEvaluated: number;
  nonce: bigint;
  txValueUsd: bigint;
  aiAnalysis: {
    chatId: string;
    provider: string;
    verified: boolean;
    riskScore: number;
    reasoning: string;
  } | null;
}

export interface ProcessedNonces {
  has: (nonce: string) => boolean;
  add: (nonce: string) => void;
}

/// Run the full 9-phase evaluation pipeline on an encrypted payload.
export async function runEvaluation(
  encryptedHex: string,
  processedNonces: ProcessedNonces
): Promise<EvaluationResult> {
  // PHASE 1: Decrypt locally
  const plaintext = decryptPayload(encryptedHex, EVALUATOR_PRIVATE_KEY);

  // PHASE 2: ABI decode
  const params = decodeAbiParameters(
    parseAbiParameters("address target, bytes calldata, uint256 value, address sender, uint256 nonce"),
    bytesToHex(plaintext) as `0x${string}`
  );
  const request: EvaluateRequest = {
    target: params[0] as Address,
    calldata: params[1] as `0x${string}`,
    value: params[2] as bigint,
    sender: params[3] as Address,
    nonce: params[4] as bigint,
  };

  // PHASE 2b: Validate
  if (request.target === "0x0000000000000000000000000000000000000000") {
    throw new Error("target address is zero");
  }
  const nonceKey = request.nonce.toString();
  if (processedNonces.has(nonceKey)) {
    throw new Error("nonce already processed");
  }

  // PHASE 3: Fetch policies
  const policies = await fetchActivePolicies();
  if (policies.length === 0) throw new Error("no active policies");

  // PHASE 4: USD conversion
  const nativeUsdPrice = await fetchNativePrice();
  const txValueUsd = (request.value * nativeUsdPrice) / (10n ** 18n);

  // PHASE 5: Run simulation against each matching policy
  let highestScore = 0;
  let selectedPolicy: any = null;
  let selectedChecks = 0;
  let selectedAiAnalysis: EvaluationResult["aiAnalysis"] = null;
  let countMatched = 0;

  for (const policy of policies) {
    const typedPolicy: any = {
      id: policy.id,
      name: policy.name,
      active: policy.active,
      conditions: policy.conditions,
      limits: policy.limits,
      signers: policy.signers,
      riskWeight: Number(policy.riskWeight),
      createdAt: policy.createdAt ?? 0n,
      updatedAt: policy.updatedAt ?? 0n,
    };
    if (!matchesConditions(request, typedPolicy.conditions)) continue;
    countMatched++;

    const checks = await runSimulation(request, typedPolicy, txValueUsd, 0n);
    const score = computeScore(checks, typedPolicy.riskWeight);

    if (score > highestScore) {
      highestScore = score;
      selectedPolicy = typedPolicy;
      selectedChecks = checks.bitmap;
      selectedAiAnalysis = checks.aiAnalysis ?? null;
    }
  }

  if (!selectedPolicy) throw new Error("no policies match this transaction");

  // PHASE 6: Map score → threshold
  const totalSigners = selectedPolicy.signers.length;
  const requiredSigners = mapScoreToThreshold(highestScore, totalSigners);
  const selectedSigners = selectedPolicy.signers.slice(0, requiredSigners);

  // PHASE 7: Mark nonce processed
  processedNonces.add(nonceKey);

  return {
    matchedPolicyId: BigInt(selectedPolicy.id),
    policyName: selectedPolicy.name,
    riskScore: highestScore,
    requiredSigners,
    totalSigners,
    signers: selectedSigners,
    checkResults: selectedChecks,
    policiesEvaluated: countMatched,
    nonce: request.nonce,
    txValueUsd,
    aiAnalysis: selectedAiAnalysis,
  };
}
