# Multisig Policy Engine — 0G Galileo

Dynamic multisig management with on-chain policy governance, off-chain transaction simulation, CoinGecko price oracle, ERC-7730 clear signing registry checks, 0G Compute AI risk analysis, and 0G Storage audit receipts.

## Architecture

```
ON-CHAIN                          EVALUATOR (Off-chain)
┌─────────────────────────┐       ┌─────────────────────────────────┐
│ GovernanceMultisig      │       │ 1. Decrypt payload via ECIES     │
│ PolicyRegistry          │◄─────►│ 2. Fetch policies from registry  │
│ AuditLog                │       │ 3. Simulate 11 risk checks       │
│ MultisigWallet          │       │ 4. Score risk → signer threshold │
│ EvaluationGateway       │       │ 5. Upload receipt to 0G Storage  │
│ EvaluatorVerifier       │       │ 6. Submit evaluation on-chain    │
└─────────────────────────┘       └─────────────────────────────────┘
```

Users submit encrypted transactions via `EvaluationGateway`. The evaluator service watches for `EvaluateRequested` events, decrypts the payload, runs 11 risk checks, uploads a full receipt to 0G Storage, and submits the result on-chain. The audit log records the policy, risk score, check results, and storage root — but **never** the target address, calldata, or value.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`)
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Funded [0G Galileo](https://chainscan-galileo.0g.ai) wallet (0G for gas)

## Setup

### 1. Clone and install dependencies

```bash
npm install
```

### 2. Install Solidity dependencies

```bash
cd contract
forge install foundry-rs/forge-std --no-git
cd ..
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
PRIVATE_KEY=your_galileo_private_key
ZG_RPC_URL=https://evmrpc-testnet.0g.ai
EVALUATOR_PRIVATE_KEY=your_evaluator_private_key
EVALUATOR_SIGNER=your_evaluator_evm_address
EVALUATOR_PUB_KEY=0x04_your_evaluator_ecies_public_key
GOVERNANCE_SIGNERS=0xSigner1,0xSigner2,0xSigner3
```

### 4. Build Solidity contracts

```bash
cd contract
forge build
```

### 5. Run tests

**Solidity tests (36 tests):**

```bash
cd contract
forge test -v
```

**TypeScript tests (37 tests):**

```bash
npx vitest run
```

## Deploying to 0G Galileo (Chain ID 16602)

### 1. Deploy core contracts (in order)

```bash
# Load env
export $(cat .env | xargs)

# 1. GovernanceMultisig (requires ALL signers to approve)
forge create --rpc-url $ZG_RPC_URL --private-key $PRIVATE_KEY --broadcast \
  contract/src/GovernanceMultisig.sol:GovernanceMultisig \
  --constructor-args "[$GOVERNANCE_SIGNERS]"

echo "GOVERNANCE_MULTISIG_ADDR=<deployed-address>" >> .env

# 2. PresetPolicyRegistry (no constructor args)
forge create --rpc-url $ZG_RPC_URL --private-key $PRIVATE_KEY --broadcast \
  contract/src/PresetPolicyRegistry.sol:PresetPolicyRegistry

echo "PRESET_POLICY_REGISTRY_ADDR=<deployed-address>" >> .env

# 3. WalletFactory (passing evaluator signer + preset registry)
forge create --rpc-url $ZG_RPC_URL --private-key $PRIVATE_KEY --broadcast \
  contract/src/WalletFactory.sol:WalletFactory \
  --constructor-args $EVALUATOR_SIGNER $PRESET_POLICY_REGISTRY_ADDR

echo "WALLET_FACTORY_ADDR=<deployed-address>" >> .env

# 4. EvaluationGateway (passing evaluator signer)
forge create --rpc-url $ZG_RPC_URL --private-key $PRIVATE_KEY --broadcast \
  contract/src/EvaluationGateway.sol:EvaluationGateway \
  --constructor-args $EVALUATOR_SIGNER

echo "EVALUATION_GATEWAY_ADDR=<deployed-address>" >> .env
```

Wallets are created via `WalletFactory.createWallet()` which deploys `MultisigWallet`, `PolicyRegistry`, `AuditLog`, and `GovernanceMultisig` clones.

### 2. Add initial policies via governance

Use the frontend governance interface or cast directly:

```bash
cast send $GOVERNANCE_MULTISIG_ADDR "propose(address,bytes,string)" \
  $POLICY_REGISTRY_ADDR \
  "0x" \
  "Add treasury policy" \
  --private-key $PRIVATE_KEY --rpc-url $ZG_RPC_URL

# All signers approve, then execute
cast send $GOVERNANCE_MULTISIG_ADDR "approve(uint256)" 0 --private-key <SIGNER2_KEY> --rpc-url $ZG_RPC_URL
cast send $GOVERNANCE_MULTISIG_ADDR "execute(uint256)" 0 --private-key $PRIVATE_KEY --rpc-url $ZG_RPC_URL
```

### 3. Start the evaluator service

```bash
docker compose up -d

# Verify health
curl -sf http://localhost:3001/health
```

The evaluator watches for `EvaluateRequested` events on `EvaluationGateway`, decrypts the payload, runs the 11-check pipeline, uploads a receipt to 0G Storage, and submits the result on-chain.

## Sending an Evaluation

```bash
# 1. Get the evaluator's ECIES public key from .env (EVALUATOR_PUB_KEY)

# 2. Encrypt the request (use eciesjs or similar)
# Encode: abi.encode(target, calldata, value, sender, nonce)
# Encrypt: eciesEncrypt(evaluatorPubKey, encoded)

# 3. Submit on-chain via EvaluationGateway
cast send $EVALUATION_GATEWAY_ADDR "sendEvaluate(bytes)" $ENCRYPTED_HEX \
  --private-key $PRIVATE_KEY \
  --rpc-url $ZG_RPC_URL
```

The evaluator service will automatically process the event and submit the evaluation.

## Scoring Spectrum

| Risk | Score | Signers | Example |
|------|-------|---------|---------|
| Lowest | 5–15 | 1-of-N | Low value, verified contract, on allowlist, ERC-7730 descriptor |
| Medium | 40–60 | 2-of-3 | Moderate value, unverified but old contract |
| Highest | 85–100 | N-of-N | High value, unverified, on denylist, no ERC-7730, proxy pattern |

## 11 Risk Checks

| # | Check | Weight | Source |
|---|-------|--------|--------|
| 0 | Allowlist | 0.10 | Policy |
| 1 | Denylist | 0.15 | Policy |
| 2 | Contract verification | 0.12 | 0G Chainscan API |
| 3 | ERC-7730 registry | 0.10 | LedgerHQ GitHub |
| 4 | Per-tx USD limit | 0.13 | CoinGecko oracle |
| 5 | Daily USD limit (per-policy) | 0.10 | CoinGecko oracle |
| 6 | Bytecode analysis | 0.10 | RPC eth_getCode |
| 7 | Contract age | 0.07 | RPC binary search |
| 8 | Transaction volume | 0.06 | RPC getTransactionCount |
| 9 | Calldata complexity | 0.07 | Calldata length |
| 10 | AI analysis | 0.15 | 0G Compute (TeeML) |

External API failures use a **fail-open** policy: the check bit is set to pass and excluded from scoring. AI analysis fails open if no compute provider is configured.

## Project Structure

```
contract/src/         Solidity contracts (EvaluationGateway, MultisigWallet, EvaluatorVerifier, etc.)
contract/test/        Forge tests (36 tests)
contract/broadcast/   Deployment records
app/                  Evaluator business logic (checks, simulation, policy matching)
app/checks/           Individual risk check implementations (11 checks)
evaluator/            Standalone evaluator service (event watcher, pipeline, storage, server)
base/                 Shared utilities
tests/                Vitest tests (37 tests)
frontend/             React web interface (governance, transactions, audit log)
Dockerfile.evaluator  Evaluator service container
docker-compose.yml    redis + evaluator
```

## License

MIT
