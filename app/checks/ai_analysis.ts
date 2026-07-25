import { ethers } from "ethers";
import { ZG_RPC_URL, EVALUATOR_PRIVATE_KEY, ZG_COMPUTE_PROVIDER } from "../config.js";

// ponytail: lazy singleton — broker created once, reused across evaluations
let brokerInstance: any = null;

async function getBroker(): Promise<any> {
  if (brokerInstance) return brokerInstance;
  const { createZGComputeNetworkBroker } = await import("@0gfoundation/0g-compute-ts-sdk");
  const provider = new ethers.JsonRpcProvider(ZG_RPC_URL);
  const wallet = new ethers.Wallet(EVALUATOR_PRIVATE_KEY, provider);
  brokerInstance = await createZGComputeNetworkBroker(wallet);
  return brokerInstance;
}

function buildPrompt(request: {
  target: string;
  calldata: string;
  value: bigint;
}): string {
  const selector = request.calldata.length >= 10 ? request.calldata.slice(0, 10) : "0x";
  const calldataLen = (request.calldata.length - 2) / 2;
  return [
    "You are a blockchain transaction risk analyzer.",
    "Analyze the following transaction and return ONLY valid JSON.",
    "",
    `Target contract: ${request.target}`,
    `Function selector: ${selector}`,
    `Calldata length: ${calldataLen} bytes`,
    `Value: ${request.value.toString()} wei`,
    "",
    'Respond with: {"risk_score": <0-100>, "reasoning": "<one sentence>"}',
    "Higher score = higher risk. Unknown selectors and large calldata = higher risk.",
  ].join("\n");
}

/// Check #10: AI calldata/intent analysis via 0G Compute (TeeML provider).
/// Returns [passed, score, executed, metadata]. Fail-open: [true, 0, false, null].
export async function checkAiAnalysis(
  request: { target: `0x${string}`; calldata: `0x${string}`; value: bigint }
): Promise<[boolean, number, boolean, { chatId: string; provider: string; verified: boolean; riskScore: number; reasoning: string } | null]> {
  if (!EVALUATOR_PRIVATE_KEY || !ZG_COMPUTE_PROVIDER) {
    return [true, 0, false, null];
  }

  try {
    const broker = await getBroker();
    const providerAddr = ZG_COMPUTE_PROVIDER as string;

    const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddr);
    const headers = await broker.inference.getRequestHeaders(providerAddr);

    const prompt = buildPrompt(request);
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[ai_analysis] HTTP ${response.status}, failing open`);
      return [true, 0, false, null];
    }

    const data = await response.json();
    const chatId = response.headers.get("ZG-Res-Key") || data.id || "";

    const verified = await broker.inference.processResponse(providerAddr, chatId);

    let aiRiskScore = 50;
    let reasoning = "unparsed";
    try {
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content);
      aiRiskScore = Math.min(100, Math.max(0, Number(parsed.risk_score) || 50));
      reasoning = parsed.reasoning || "no reasoning";
    } catch {
      // AI didn't return parseable JSON — use default moderate score
    }

    const passed = aiRiskScore < 60;
    return [
      passed,
      aiRiskScore,
      true,
      { chatId, provider: providerAddr, verified, riskScore: aiRiskScore, reasoning },
    ];
  } catch (err) {
    console.warn("[ai_analysis] Compute call failed (fail-open):", err instanceof Error ? err.message : err);
    return [true, 0, false, null];
  }
}
