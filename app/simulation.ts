import type { Policy, EvaluateRequest, SimulationResult } from "./types.js";
import { runCheck, runCheckAsync } from "./checks/index.js";
import {
  checkAllowlist,
  checkDenylist,
  checkPerTxLimit,
  checkDailyLimit,
} from "./checks/limits.js";
import { checkContractVerified } from "./checks/verification.js";
import { checkErc7730Registry } from "./checks/erc7730.js";
import { checkBytecode } from "./checks/bytecode.js";
import { checkContractAge, checkTxVolume } from "./checks/contract_age.js";
import { checkAiAnalysis } from "./checks/ai_analysis.js";

export async function runSimulation(
  request: EvaluateRequest,
  policy: Policy,
  txValueUsd: bigint,
  policyDailyVolumeUsd: bigint
): Promise<SimulationResult> {
  const result: SimulationResult = {
    bitmap: 0,
    scores: [],
    weights: [],
    executed: [],
  };

  const addResult = (
    bit: number,
    passed: boolean,
    score: number,
    weight: number,
    executed: boolean
  ) => {
    if (passed) result.bitmap |= 1 << bit;
    result.scores.push(score);
    result.weights.push(weight);
    result.executed.push(executed);
  };

  // CHECK 0: Allowlist (weight 0.10)
  const [p0, s0, e0] = runCheck(() => checkAllowlist(request.target, policy.limits.allowlist), true);
  addResult(0, p0, s0, 0.1, e0);

  // CHECK 1: Denylist (weight 0.15)
  const [p1, s1, e1] = runCheck(() => checkDenylist(request.target, policy.limits.denylist), true);
  addResult(1, p1, s1, 0.15, e1);

  // CHECK 2: Contract verification (weight 0.12)
  const [p2, s2, e2] = await runCheckAsync(
    () => checkContractVerified(request.target),
    true
  );
  addResult(2, p2, s2, 0.12, e2);

  // CHECK 3: ERC-7730 registry (weight 0.10)
  const [p3, s3, e3] = await runCheckAsync(
    () => checkErc7730Registry(request.target),
    true
  );
  addResult(3, p3, s3, 0.1, e3);

  // CHECK 4: Per-tx value limit (weight 0.13)
  const [p4, s4, e4] = runCheck(
    () => checkPerTxLimit(txValueUsd, policy.limits.maxValuePerTxUsd),
    true
  );
  addResult(4, p4, s4, 0.13, e4);

  // CHECK 5: Daily limit per-policy (weight 0.10)
  const [p5, s5, e5] = runCheck(
    () => checkDailyLimit(txValueUsd, policyDailyVolumeUsd, policy.limits.maxValueDailyUsd),
    true
  );
  addResult(5, p5, s5, 0.1, e5);

  // CHECK 6: Bytecode analysis (weight 0.10)
  const [p6, s6, e6] = await runCheckAsync(
    () => checkBytecode(request.target),
    true
  );
  addResult(6, p6, s6, 0.1, e6);

  // CHECK 7: Contract age (weight 0.07)
  const [p7, s7, e7] = await runCheckAsync(
    () => checkContractAge(request.target),
    true
  );
  addResult(7, p7, s7, 0.07, e7);

  // CHECK 8: Transaction volume (weight 0.06)
  const [p8, s8, e8] = await runCheckAsync(
    () => checkTxVolume(request.target),
    true
  );
  addResult(8, p8, s8, 0.06, e8);

  // CHECK 9: Calldata complexity (weight 0.07)
  const [p9, s9, e9] = runCheck(() => {
    const data = request.calldata;
    const len = (data.length - 2) / 2;
    let score: number;
    let pass: boolean;
    if (len === 0) {
      pass = true;
      score = 5;
    } else if (len <= 68) {
      pass = true;
      score = 15;
    } else if (len <= 260) {
      pass = false;
      score = 40;
    } else {
      pass = false;
      score = 70;
    }
    return [pass, score] as [boolean, number];
  }, true);
  addResult(9, p9, s9, 0.07, e9);

  // CHECK 10: AI calldata/intent analysis via 0G Compute (weight 0.15)
  const [p10, s10, e10, aiMeta] = await checkAiAnalysis(request);
  addResult(10, p10, s10, 0.15, e10);
  result.aiAnalysis = aiMeta;

  return result;
}

export function computeScore(checks: SimulationResult, policyRiskWeight: number): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (let i = 0; i < checks.scores.length; i++) {
    if (checks.executed[i]) {
      weightedSum += checks.scores[i] * checks.weights[i];
      totalWeight += checks.weights[i];
    }
  }

  let composite: number;
  if (totalWeight === 0) {
    composite = 50;
  } else {
    composite = weightedSum / totalWeight;
  }

  let result = composite * (1.0 + (policyRiskWeight - 1) * 0.1);

  if (!(checks.bitmap & (1 << 1))) {
    result = Math.max(result, 90);
  }
  if (!(checks.bitmap & (1 << 4))) {
    result = Math.max(result, 80);
  }

  return Math.min(100, Math.max(0, Math.round(result)));
}
