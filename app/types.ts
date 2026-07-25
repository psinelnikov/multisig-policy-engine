export interface Conditions {
  targetAddresses: `0x${string}`[];
  functionSelectors: `0x${string}`[];
  minValue: bigint;
  maxValue: bigint;
  timeWindowStart: bigint;
  timeWindowEnd: bigint;
  requireVerified: boolean;
  requireErc7730: boolean;
}

export interface Limits {
  maxValuePerTxUsd: bigint;
  maxValueDailyUsd: bigint;
  allowlist: `0x${string}`[];
  denylist: `0x${string}`[];
}

export interface Policy {
  id: bigint;
  name: string;
  active: boolean;
  conditions: Conditions;
  limits: Limits;
  signers: `0x${string}`[];
  riskWeight: number;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface EvaluateRequest {
  target: `0x${string}`;
  calldata: `0x${string}`;
  value: bigint;
  sender: `0x${string}`;
  nonce: bigint;
}

export interface PolicyDecision {
  matchedPolicyId: bigint;
  policyName: string;
  riskScore: number;
  requiredSigners: number;
  totalSigners: number;
  signers: `0x${string}`[];
  checkResults: number;
  policiesEvaluated: number;
  nonce: bigint;
}

export interface AuditReceipt {
  evaluationId: `0x${string}`;
  policyId: bigint;
  policyName: string;
  riskScore: number;
  checkResults: number;
  requiredSigners: number;
  totalSigners: number;
  timestamp: bigint;
}

export interface DailyVolume {
  date: string;
  totalUsd: bigint;
}

export interface State {
  evaluationsProcessed: bigint;
  lastMatchedPolicyId: bigint;
  lastRiskScore: number;
  processedNonces: Set<string>;
  policyDailyVolumes: Map<string, DailyVolume>;
}

export interface CheckResult {
  passed: boolean;
  score: number;
  executed: boolean;
}

export interface SimulationResult {
  bitmap: number;
  scores: number[];
  weights: number[];
  executed: boolean[];
  aiAnalysis?: {
    chatId: string;
    provider: string;
    verified: boolean;
    riskScore: number;
    reasoning: string;
  } | null;
}

export interface StateReport {
  evaluationsProcessed: string;
  lastMatchedPolicyId: string;
  lastRiskScore: number;
  registryAddress: string;
  auditLogAddress: string;
  policyDailyVolumes: Record<string, string>;
}
