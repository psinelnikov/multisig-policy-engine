import { State, EvaluateRequest, PolicyDecision, AuditReceipt } from "./types.js";
import { SIGN_PORT } from "./config.js";
import { hexToBytes, bytesToHex, keccak256 } from "../base/utils.js";
import { fetchActivePolicies, getCurrentBlockTimestamp } from "./rpc.js";
import { matchesConditions, mapScoreToThreshold, today } from "./policy_matcher.js";
import { runSimulation, computeScore } from "./simulation.js";
import { fetchNativePrice } from "./checks/oracle.js";
import { encodeAbiParameters, parseAbiParameters, decodeAbiParameters } from "viem";

export async function handleEvaluate(
  state: State,
  msg: string
): Promise<[string | null, number, string | null]> {
  // PHASE 1: Decrypt
  const rawBytes = hexToBytes(msg);

  let plaintext: Uint8Array;
  try {
    const resp = await fetch(`http://localhost:${SIGN_PORT}/decrypt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encryptedMessage: Buffer.from(rawBytes).toString("base64"),
      }),
    });
    const json = await resp.json();
    plaintext = Buffer.from((json as any).decryptedMessage, "base64");
  } catch (err) {
    return [null, 0, `Decryption failed: ${err}`];
  }

  // PHASE 2: ABI decode EvaluateRequest
  let request: EvaluateRequest;
  try {
    const params = decodeAbiParameters(
      parseAbiParameters("address target, bytes calldata, uint256 value, address sender, uint256 nonce"),
      bytesToHex(plaintext) as `0x${string}`
    );
    request = {
      target: params[0] as `0x${string}`,
      calldata: params[1] as `0x${string}`,
      value: params[2] as bigint,
      sender: params[3] as `0x${string}`,
      nonce: params[4] as bigint,
    };
  } catch (err) {
    return [null, 0, `ABI decode failed: ${err}`];
  }

  // PHASE 2b: Validate
  if (request.target === "0x0000000000000000000000000000000000000000") {
    return [null, 0, "target address is zero"];
  }
  if (state.processedNonces.has(request.nonce.toString())) {
    return [null, 0, "nonce already processed"];
  }

  // PHASE 3: Fetch policies
  let policies: any[];
  try {
    policies = await fetchActivePolicies();
  } catch (err) {
    return [null, 0, `Failed to fetch policies: ${err}`];
  }
  if (policies.length === 0) {
    return [null, 0, "no active policies"];
  }

  // PHASE 4: Convert value to USD via FTSO
  let nativeUsdPrice: bigint;
  try {
    nativeUsdPrice = await fetchNativePrice();
  } catch (err) {
    return [null, 0, `FTSO price fetch failed: ${err}`];
  }
  const txValueUsd = (request.value * nativeUsdPrice) / (10n ** 18n);

  // PHASE 5: Run simulation against each matching policy
  let highestScore = 0;
  let selectedPolicy: any = null;
  let selectedChecks = 0;
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
    };

    if (!matchesConditions(request, typedPolicy.conditions)) continue;
    countMatched++;

    const policyKey = policy.id.toString();
    let pv = state.policyDailyVolumes.get(policyKey) || { date: today(), totalUsd: 0n };
    if (pv.date !== today()) {
      pv = { date: today(), totalUsd: 0n };
    }

    const checks = await runSimulation(request, typedPolicy, txValueUsd, pv.totalUsd);
    const score = computeScore(checks, typedPolicy.riskWeight);

    if (score > highestScore) {
      highestScore = score;
      selectedPolicy = typedPolicy;
      selectedChecks = checks.bitmap;
    }
  }

  if (!selectedPolicy) {
    return [null, 0, "no policies match this transaction"];
  }

  // PHASE 6: Map score → threshold
  const totalSigners = selectedPolicy.signers.length;
  const requiredSigners = mapScoreToThreshold(highestScore, totalSigners);
  const selectedSigners = selectedPolicy.signers.slice(0, requiredSigners);

  // PHASE 7: Update state
  state.evaluationsProcessed += 1n;
  state.lastMatchedPolicyId = BigInt(selectedPolicy.id);
  state.lastRiskScore = highestScore;
  state.processedNonces.add(request.nonce.toString());

  const policyKey = selectedPolicy.id.toString();
  let pv = state.policyDailyVolumes.get(policyKey) || { date: today(), totalUsd: 0n };
  if (pv.date !== today()) {
    pv = { date: today(), totalUsd: 0n };
  }
  pv.totalUsd += txValueUsd;
  state.policyDailyVolumes.set(policyKey, pv);

  // PHASE 8: Build audit receipt
  const nowTimestamp = await getCurrentBlockTimestamp();
  const evaluationIdInput = bytesToHex(
    keccak256(
      new TextEncoder().encode(
        request.nonce.toString() + selectedPolicy.id.toString() + nowTimestamp.toString()
      )
    )
  );

  // PHASE 9: Encode and return
  try {
    const encoded = encodeAbiParameters(
      [
        {
          name: "decision",
          type: "tuple",
          components: [
            { name: "matchedPolicyId", type: "uint256" },
            { name: "policyName", type: "string" },
            { name: "riskScore", type: "uint8" },
            { name: "requiredSigners", type: "uint8" },
            { name: "totalSigners", type: "uint8" },
            { name: "signers", type: "address[]" },
            { name: "checkResults", type: "uint16" },
            { name: "policiesEvaluated", type: "uint8" },
            { name: "nonce", type: "uint256" },
          ],
        },
        {
          name: "receipt",
          type: "tuple",
          components: [
            { name: "evaluationId", type: "bytes32" },
            { name: "policyId", type: "uint256" },
            { name: "policyName", type: "string" },
            { name: "riskScore", type: "uint8" },
            { name: "checkResults", type: "uint16" },
            { name: "requiredSigners", type: "uint8" },
            { name: "totalSigners", type: "uint8" },
            { name: "timestamp", type: "uint256" },
          ],
        },
      ],
      [
        {
          matchedPolicyId: BigInt(selectedPolicy.id),
          policyName: selectedPolicy.name,
          riskScore: highestScore,
          requiredSigners,
          totalSigners,
          signers: selectedSigners,
          checkResults: selectedChecks,
          policiesEvaluated: countMatched,
          nonce: request.nonce,
        },
        {
          evaluationId: evaluationIdInput as `0x${string}`,
          policyId: BigInt(selectedPolicy.id),
          policyName: selectedPolicy.name,
          riskScore: highestScore,
          checkResults: selectedChecks,
          requiredSigners,
          totalSigners,
          timestamp: nowTimestamp,
        },
      ]
    );

    return [encoded, 1, null];
  } catch (err) {
    return [null, 0, `Encoding failed: ${err}`];
  }
}
