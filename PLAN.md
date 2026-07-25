# 0G Migration — Plan & State Tracker

Migrating Multisig Policy Engine from Flare Coston2 to 0G Galileo testnet.
Baseline tag: `flare-baseline-2025-07-25` (35 Solidity tests, 37 TS tests passing).

## Status Legend
- `pending` / `in_progress` / `done` / `blocked` / `skipped`

---

## Phase 0 — Prerequisites & repo baseline
- [x] Tag baseline `flare-baseline-2025-07-25`
- [ ] Bump Node engines >= 22 in package.json files
- [ ] Install 0G SDKs (@0gfoundation/0g-compute-ts-sdk, @0gfoundation/0g-ts-sdk, ethers)
- [ ] Create CHANGELOG.md
- [ ] De-risk 0G Compute (deferred to Phase 3 — mock if providers down)

## Phase 1 — Chain migration: contracts + config
### 1a. Foundry config
- [x] foundry.toml: evm_version=cancun, galileo RPC, keep coston2 ref
### 1b. Contract changes
- [x] Delete InstructionSender.sol, ITeeExtensionRegistry.sol, ITeeMachineRegistry.sol
- [x] New EvaluationGateway.sol (event-based, replaces InstructionSender)
- [x] MultisigWallet.sol: remove TEE registry, add evaluatorSigner, remove submitEvaluationAttested
- [x] EvaluatorVerifier.sol (replaces TeeVerifier.sol): ECDSA verification, no Flare deps
- [x] AuditLog.sol: add storageRoot field
- [x] WalletFactory.sol: remove TEE registry param, add evaluatorSigner
- [x] Delete TeeVerifier.sol
### 1b-tests. Update Solidity tests
- [x] MultisigPolicy.t.sol: new interfaces, remove attested tests, add evaluator/gateway tests
- [x] WalletFactory.t.sol: new constructor signature
- [x] Delete mock registries + DeployInstructionSender.s.sol
- [x] Deploy.s.sol updated for EvaluationGateway + evaluatorSigner
- [x] All 36 tests pass (was 35)
### 1c. Deploy script
- [ ] Galileo deploy script (scripted, execution deferred — needs funded wallet)
### 1d. Frontend chain config
- [ ] constants.ts: ZG_GALILEO_CHAIN
- [ ] wagmi.ts: Galileo chain
- [ ] abi.ts: EvaluationGateway ABI, update wallet ABI

## Phase 2 — Evaluator service (replace TEE)
- [x] evaluator/ directory: index, config, decrypt, pipeline, submit
- [x] app/rpc.ts → Galileo chain (zgGalileo)
- [x] app/config.ts → 0G constants
- [x] oracle.ts → CoinGecko (fetchNativePrice)
- [x] verification.ts → chainscan-galileo API
- [x] Frontend encryption.ts: evaluator pubkey from env
- [x] docker-compose.yml: redis + evaluator
- [x] Frontend TestTransactionsPage: submit via EvaluationGateway
- [x] 37 TS tests pass, tsc clean

## Phase 5 — Oracle replacement
- [x] oracle.ts: CoinGecko zero-g/USD (done in Phase 2)

## Phase 3 — 0G Compute AI risk check
- [ ] app/checks/ai_analysis.ts
- [ ] simulation.ts: add check #10
- [ ] types.ts: AI fields
- [ ] Fail-open if providers down

## Phase 4 — 0G Storage audit receipts
- [ ] evaluator/storage.ts
- [ ] AuditLog storageRoot populated from upload
- [ ] evaluator/server.ts: receipt proxy endpoint
- [ ] AuditLogPage: fetch from storage proxy

## Phase 5 — Oracle replacement
- [ ] oracle.ts: CoinGecko zero-g/USD

## Phase 7 — Submission artifacts
- [ ] README rewrite
- [ ] CHANGELOG finalize
- [ ] .env.example update

## Deviations from plan
- MultisigWallet.initialize takes 3 params (auditLog, governance, evaluatorSigner) not 2.
  The plan says "set during init" but also says 2 params — resolved by including evaluatorSigner
  as 3rd param so it's set atomically at init. WalletFactory passes evaluatorSigner (replaces
  teeExtensionRegistry in constructor).
- submitEvaluation now takes a 7th param bytes32 _storageRoot (for 0G Storage root hash).
  Old: (txId, riskScore, checkResults, matchedPolicyId, requiredSigners, signers)
  New: (txId, riskScore, checkResults, matchedPolicyId, requiredSigners, signers, storageRoot)

## Deployment status
- Contracts: NOT YET DEPLOYED to Galileo (needs funded wallet + network)
- Scripts prepared for manual execution
