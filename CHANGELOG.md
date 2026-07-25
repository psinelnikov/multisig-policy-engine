# Changelog

## 2025-07-25 — 0G Galileo migration

### Changed
- Migrated from Flare Coston2 to 0G Galileo testnet (Chain ID 16602)
- Replaced Flare TEE extension with standalone 0G Compute-backed evaluator service
- Replaced FTSO V2 oracle with CoinGecko API for 0G/USD price
- Replaced InstructionSender (Flare TEE protocol) with EvaluationGateway (event-based)
- Replaced TeeVerifier (TEE attestation) with EvaluatorVerifier (ECDSA signature)
- MultisigWallet now restricts submitEvaluation to registered evaluator signer
- AuditLog entries now include 0G Storage root hash for full receipt retrieval

### Added
- 0G Compute integration: AI calldata/intent analysis (check #10)
- 0G Storage integration: full audit receipts uploaded and retrievable
- Standalone evaluator service (evaluator/) replacing Docker TEE container
- EvaluationGateway contract for event-driven evaluation requests

### Removed
- Flare TEE infrastructure (InstructionSender, TeeExtensionRegistry, TeeMachineRegistry)
- Docker ext-proxy and extension-tee services
- Go-based TEE extension build
- FTSO V2 price feed dependency
