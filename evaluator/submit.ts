import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { zgGalileo } from "../app/rpc.js";
import { ZG_RPC_URL, EVALUATOR_PRIVATE_KEY, MULTISIG_WALLET_ADDR } from "./config.js";
import type { EvaluationResult } from "./pipeline.js";

const WALLET_ABI = parseAbi([
  "function submitEvaluation(uint256 _txId, uint8 _riskScore, uint16 _checkResults, uint256 _matchedPolicyId, uint8 _requiredSigners, address[] _signers, bytes32 _storageRoot) external",
]);

const account = privateKeyToAccount(EVALUATOR_PRIVATE_KEY as `0x${string}`);

const walletClient = createWalletClient({
  account,
  chain: zgGalileo,
  transport: http(ZG_RPC_URL),
});

/// Submit an evaluation result on-chain via MultisigWallet.submitEvaluation.
/// Only the registered evaluator signer can call this.
export async function submitEvaluation(
  txId: bigint,
  result: EvaluationResult,
  storageRoot: `0x${string}`
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: MULTISIG_WALLET_ADDR,
    abi: WALLET_ABI,
    functionName: "submitEvaluation",
    args: [
      txId,
      result.riskScore,
      result.checkResults,
      result.matchedPolicyId,
      result.requiredSigners,
      result.signers,
      storageRoot,
    ],
  });
  return hash;
}
