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
- [ ] foundry.toml: evm_version=cancun, galileo RPC, keep coston2 ref
### 1b. Contract changes
- [ ] Delete InstructionSender.sol, ITeeExtensionRegistry.sol, ITeeMachineRegistry.sol
- [ ] New EvaluationGateway.sol (event-based, replaces InstructionSender)
- [ ] MultisigWallet.sol: remove TEE registry, add evaluatorSigner, remove submitEvaluationAttested
- [ ] EvaluatorVerifier.sol (replaces TeeVerifier.sol): ECDSA verification, no Flare deps
- [ ] AuditLog.sol: add storageRoot field
- [ ] WalletFactory.sol: remove TEE registry param, add evaluatorSigner
- [ ] Delete TeeVerifier.sol
### 1b-tests. Update Solidity tests
- [ ] MultisigPolicy.t.sol: new interfaces, remove attested tests
- [ ] WalletFactory.t.sol: new constructor signature
- [ ] Delete mock registries (no longer needed)
### 1c. Deploy script
- [ ] Galileo deploy script (scripted, execution deferred — needs funded wallet)
### 1d. Frontend chain config
- [ ] constants.ts: ZG_GALILEO_CHAIN
- [ ] wagmi.ts: Galileo chain
- [ ] abi.ts: EvaluationGateway ABI, update wallet ABI

## Phase 2 — Evaluator service (replace TEE)
- [ ] evaluator/ directory: index, config, decrypt, submit
- [ ] Strip Flare routing from base/server.ts
- [ ] oracle.ts → CoinGecko (merged with Phase 5)
- [ ] rpc.ts → Galileo chain
- [ ] verification.ts → chainscan-galileo API
- [ ] Frontend encryption.ts: evaluator pubkey from env
- [ ] docker-compose.yml: redis + evaluator
- [ ] Frontend TestTransactionsPage: submit via EvaluationGateway

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
- (none yet)

## Deployment status
- Contracts: NOT YET DEPLOYED to Galileo (needs funded wallet + network)
- Scripts prepared for manual execution
