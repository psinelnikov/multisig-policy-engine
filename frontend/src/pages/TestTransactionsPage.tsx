import { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseEther, formatEther, encodeFunctionData, parseUnits, type Address } from "viem";
import { useMultisig } from "../context/MultisigContext";
import { POLICY_REGISTRY_ABI, MULTISIG_WALLET_ABI, ERC20_ABI, EVALUATION_GATEWAY_ABI } from "../lib/abi";
import { CONTRACTS, shortAddress, riskColor, riskLabel, decodeCheckResults, GALILEO_GAS_PRICE } from "../lib/constants";
import { CopyableAddress } from "../components/CopyableAddress";
import { useSearchParams, Link } from "react-router-dom";
import { encryptEvaluateRequest, getEvaluatorPublicKey, type EvaluateRequest } from "../lib/encryption";

const TEST_SCENARIOS = [
  { id: 0, name: "Low Value Transfer", description: "Transfers under $1,000 — auto-approve, 1 signer", value: "0.0001", tokenValue: "500" },
  { id: 1, name: "High-Value Transfer", description: "Transfers over 1000 USDC — 2 signers required", value: "0.001", tokenValue: "1500" },
  { id: 2, name: "Very High Value Transfer", description: "Large transfers >$50K — admin-level, 3 signers", value: "0.01", tokenValue: "100000" },
  { id: 3, name: "DeFi Interaction", description: "Whitelisted DeFi protocol interaction", value: "0.0005", tokenValue: "5000" },
];

const EVALUATOR_PROXY = import.meta.env.VITE_EVALUATOR_URL || "/evaluator";

export default function TestTransactionsPage() {
  const { address } = useAccount();
  const { selectedMultisig, hasSelection } = useMultisig();
  const publicClient = usePublicClient();
  const [searchParams] = useSearchParams();
  const txIdFromUrl = searchParams.get("tx");

  const [activeTab, setActiveTab] = useState<"scenarios" | "erc20" | "mint" | "custom" | "evaluate">("scenarios");
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);

  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [erc20Target, setErc20Target] = useState("");
  const [erc20Amount, setErc20Amount] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [customData, setCustomData] = useState("0x");

  const [evalStatus, setEvalStatus] = useState<"idle" | "encrypting" | "sending" | "polling" | "complete" | "error">("idle");
  const [evalError, setEvalError] = useState<string | null>(null);

  const [submittedTxId, setSubmittedTxId] = useState<string | null>(txIdFromUrl);
  const [txDetails, setTxDetails] = useState<{
    target: string; value: string; data: string;
    evaluated: boolean; executed: boolean;
    requiredSigners: number; approvalCount: number; riskScore: number;
    checkResults: number; storageRoot: string;
  } | null>(null);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const { writeContract: writeGateway, data: gatewayHash, isPending: isGatewayPending } = useWriteContract();
  const { isLoading: isGatewayConfirming, isSuccess: isGatewayConfirmed } = useWaitForTransactionReceipt({ hash: gatewayHash });

  const fetchBalance = useCallback(async () => {
    if (!selectedMultisig || !publicClient) return;
    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.testToken, abi: ERC20_ABI,
        functionName: "balanceOf", args: [selectedMultisig.wallet],
      });
      setTokenBalance(formatEther(typeof result === "bigint" ? result : BigInt(result as string)));
    } catch { setTokenBalance("0"); }
  }, [selectedMultisig, publicClient]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const fetchTxDetails = useCallback(async (txId: string) => {
    if (!selectedMultisig || !publicClient) return;
    try {
      const result = await publicClient.readContract({
        address: selectedMultisig.wallet, abi: MULTISIG_WALLET_ABI,
        functionName: "getTransaction", args: [BigInt(txId)],
      });
      const approvals = await publicClient.readContract({
        address: selectedMultisig.wallet, abi: MULTISIG_WALLET_ABI,
        functionName: "approvalCount", args: [BigInt(txId)],
      });
      setTxDetails({
        target: result[0] as string, value: formatEther(result[2] as bigint),
        data: result[1] as string, evaluated: result[5] as boolean, executed: result[4] as boolean,
        requiredSigners: Number(result[6]), approvalCount: Number(approvals),
        riskScore: Number(result[7]), checkResults: Number(result[8]),
        storageRoot: result[10] as string,
      });
    } catch (err) { console.error("Failed to fetch tx details:", err); }
  }, [selectedMultisig, publicClient]);

  // Refresh tx details after submit confirms
  useEffect(() => {
    if (!isConfirmed || !hash || !publicClient || !selectedMultisig) return;
    const update = async () => {
      try {
        const count = await publicClient.readContract({
          address: selectedMultisig.wallet, abi: MULTISIG_WALLET_ABI, functionName: "txCount",
        });
        const actualTxId = (count - 1n).toString();
        setSubmittedTxId(actualTxId);
        fetchTxDetails(actualTxId);
        fetchBalance();
      } catch (err) { console.error(err); }
    };
    update();
  }, [isConfirmed, hash, publicClient, selectedMultisig, fetchTxDetails, fetchBalance]);

  // Poll for evaluation result when evaluator is processing
  useEffect(() => {
    if (evalStatus !== "polling" || !submittedTxId || !selectedMultisig || !publicClient) return;
    const poll = async () => {
      try {
        const result = await publicClient.readContract({
          address: selectedMultisig.wallet, abi: MULTISIG_WALLET_ABI,
          functionName: "getTransaction", args: [BigInt(submittedTxId)],
        });
        if (result[5] as boolean) {
          setEvalStatus("complete");
          fetchTxDetails(submittedTxId);
        }
      } catch { /* retry */ }
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [evalStatus, submittedTxId, selectedMultisig, publicClient, fetchTxDetails]);

  // When gateway tx confirms, start polling for evaluation
  useEffect(() => {
    if (isGatewayConfirmed && evalStatus === "sending") {
      setEvalStatus("polling");
    }
  }, [isGatewayConfirmed, evalStatus]);

  useEffect(() => {
    if (txIdFromUrl && selectedMultisig && publicClient) {
      setActiveTab("evaluate");
      fetchTxDetails(txIdFromUrl);
    }
  }, [txIdFromUrl, selectedMultisig, publicClient, fetchTxDetails]);

  const handleSubmitScenario = (scenario: typeof TEST_SCENARIOS[0]) => {
    if (!selectedMultisig || !address) return;
    const nonce = BigInt(Date.now());
    setSelectedScenario(scenario.id);
    setEvalError(null);
    setEvalStatus("idle");
    const transferData = encodeFunctionData({
      abi: ERC20_ABI, functionName: "transfer",
      args: [address, parseUnits(scenario.tokenValue, 18)],
    });
    setSubmittedTxId(null);
    writeContract({
      address: selectedMultisig.wallet, abi: MULTISIG_WALLET_ABI,
      functionName: "submitTransaction", args: [CONTRACTS.testToken, transferData, nonce], value: 0n,
      gasPrice: GALILEO_GAS_PRICE,
    });
  };

  const startEvaluation = async () => {
    if (!selectedMultisig || !address || !submittedTxId || !publicClient) return;
    setEvalStatus("encrypting");
    setEvalError(null);
    try {
      const txResult = await publicClient.readContract({
        address: selectedMultisig.wallet, abi: MULTISIG_WALLET_ABI,
        functionName: "getTransaction", args: [BigInt(submittedTxId)],
      });
      const request: EvaluateRequest = {
        target: txResult[0] as Address, calldata: txResult[1] as `0x${string}`,
        value: txResult[2] as bigint, sender: address, nonce: txResult[3] as bigint,
      };
      const evaluatorPubKey = getEvaluatorPublicKey();
      const encryptedMessage = encryptEvaluateRequest(evaluatorPubKey, request);
      setEvalStatus("sending");
      writeGateway({
        address: CONTRACTS.evaluationGateway, abi: EVALUATION_GATEWAY_ABI,
        functionName: "sendEvaluate", args: [encryptedMessage], value: 0n,
        gasPrice: GALILEO_GAS_PRICE,
      });
    } catch (err) {
      console.error("Evaluation failed:", err);
      setEvalError(`Evaluation failed: ${err}`);
      setEvalStatus("error");
    }
  };

  const handleSubmitErc20 = () => {
    if (!selectedMultisig || !erc20Target || !erc20Amount) return;
    const nonce = BigInt(Date.now());
    const transferData = encodeFunctionData({
      abi: ERC20_ABI, functionName: "transfer",
      args: [erc20Target as `0x${string}`, parseUnits(erc20Amount, 18)],
    });
    writeContract({
      address: selectedMultisig.wallet, abi: MULTISIG_WALLET_ABI,
      functionName: "submitTransaction", args: [CONTRACTS.testToken, transferData, nonce], value: 0n,
      gasPrice: GALILEO_GAS_PRICE,
    });
  };

  const handleMintToMultisig = () => {
    if (!selectedMultisig) return;
    writeContract({ address: CONTRACTS.testToken, abi: ERC20_ABI, functionName: "mint", args: [selectedMultisig.wallet, 100000n], gasPrice: GALILEO_GAS_PRICE });
  };

  const handleSubmitCustom = () => {
    if (!selectedMultisig || !customTarget || !customValue) return;
    const nonce = BigInt(Date.now());
    writeContract({
      address: selectedMultisig.wallet, abi: MULTISIG_WALLET_ABI,
      functionName: "submitTransaction",
      args: [customTarget as `0x${string}`, customData as `0x${string}`, nonce],
      value: parseEther(customValue),
      gasPrice: GALILEO_GAS_PRICE,
    });
  };

  const handleApproveTx = () => {
    if (!selectedMultisig || !submittedTxId) return;
    writeContract({ address: selectedMultisig.wallet, abi: MULTISIG_WALLET_ABI, functionName: "approveTx", args: [BigInt(submittedTxId)], gasPrice: GALILEO_GAS_PRICE });
  };

  const handleExecuteTx = () => {
    if (!selectedMultisig || !submittedTxId) return;
    writeContract({ address: selectedMultisig.wallet, abi: MULTISIG_WALLET_ABI, functionName: "executeTx", args: [BigInt(submittedTxId)], gasPrice: GALILEO_GAS_PRICE });
  };

  if (!hasSelection) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">No Multisig Selected</h2>
        <p className="text-[var(--text-secondary)] mb-6">Please select a multisig wallet to test transactions</p>
        <Link to="/" className="btn btn-primary">Go to Home</Link>
      </div>
    );
  }

  const evalButtonText = () => {
    if (!submittedTxId) return "Submit Transaction First";
    switch (evalStatus) {
      case "encrypting": return "Encrypting...";
      case "sending": return "Sending to Gateway...";
      case "polling": return "Evaluator Processing...";
      case "complete": return "Evaluation Complete";
      case "error": return "Error - Try Again";
      default: return "Start Evaluation";
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Test Transactions</h1>
        <Link to="/pending" className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--border)] text-sm">View Pending →</Link>
      </div>
      <p className="text-[var(--text-secondary)] mb-2">Wallet: <CopyableAddress address={selectedMultisig!.wallet} /></p>
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-3 py-1.5 flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)]">USDC:</span>
          <span className="text-sm font-mono font-medium">{tokenBalance}</span>
          <button onClick={fetchBalance} className="text-xs text-[var(--accent)] hover:text-[var(--text-primary)] ml-2">↻</button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["scenarios", "evaluate", "erc20", "mint", "custom"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md font-medium transition-colors capitalize ${activeTab === tab ? "bg-[var(--accent)] text-black" : "bg-[var(--bg-card)] hover:bg-[var(--border)]"}`}>
            {tab === "erc20" ? "ERC20 Transfer" : tab}
          </button>
        ))}
      </div>

      {activeTab === "scenarios" && (
        <div className="space-y-4">
          {TEST_SCENARIOS.map((scenario) => (
            <div key={scenario.id} className={`bg-[var(--bg-card)] border rounded-lg p-5 ${selectedScenario === scenario.id ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{scenario.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{scenario.description}</p>
                </div>
              </div>
              <div className="text-sm mb-4 text-[var(--text-secondary)]">{Number(scenario.tokenValue).toLocaleString()} USDC</div>
              <button onClick={() => handleSubmitScenario(scenario)} disabled={isPending || isConfirming}
                className="w-full px-4 py-2 bg-[var(--accent)] text-black rounded-md hover:opacity-80 disabled:opacity-50">
                {isPending ? "Submitting..." : isConfirming ? "Confirming..." : "Submit Transaction"}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "evaluate" && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">0G Compute Evaluation</h3>

            {evalError && (
              <div className="bg-[var(--red)] bg-opacity-10 border border-[var(--red)] rounded-md p-4 mb-4">
                <p className="text-[var(--red)] text-sm">{evalError}</p>
              </div>
            )}

            {submittedTxId ? (
              <div className="bg-[var(--green)] bg-opacity-10 border border-[var(--green)] rounded-md p-3 mb-4">
                <p className="text-sm">Transaction ID: {submittedTxId}</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] mb-4">Submit a transaction from the Test Scenarios tab first.</p>
            )}

            <button onClick={startEvaluation}
              disabled={!submittedTxId || evalStatus === "encrypting" || evalStatus === "sending" || evalStatus === "polling" || isGatewayPending}
              className="w-full px-4 py-2 bg-[var(--accent)] text-black rounded-md hover:opacity-80 disabled:opacity-50 mb-4">
              {isGatewayPending ? "Confirming..." : isGatewayConfirming ? "Confirming..." : evalButtonText()}
            </button>

            {evalStatus === "polling" && (
              <p className="text-sm text-[var(--text-secondary)] text-center mb-4">
                Evaluator service is processing via 0G Compute... (polling on-chain)
              </p>
            )}

            {txDetails?.evaluated && (
              <div className="bg-[var(--bg-secondary)] rounded-md p-4">
                <h4 className="font-medium mb-3">Evaluation Result</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-[var(--bg-card)] rounded-md p-3">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Risk Score</div>
                    <div className="font-mono text-lg" style={{ color: riskColor(txDetails.riskScore) }}>{txDetails.riskScore}/100</div>
                  </div>
                  <div className="bg-[var(--bg-card)] rounded-md p-3">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Signers Required</div>
                    <div className="font-mono text-lg">{txDetails.requiredSigners}</div>
                  </div>
                </div>
                {txDetails.storageRoot && txDetails.storageRoot !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
                  <div className="bg-[var(--bg-card)] rounded-md p-3 mb-3">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">0G Storage Root</div>
                    <div className="font-mono text-xs break-all">{txDetails.storageRoot}</div>
                  </div>
                )}
                <div className="bg-[var(--bg-card)] rounded-md p-3">
                  <div className="text-xs text-[var(--text-secondary)] mb-2">Check Results</div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {decodeCheckResults(txDetails.checkResults).map((check) => (
                      <div key={check.bit} className={`flex items-center gap-1 ${check.pass ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        <span>{check.pass ? "✓" : "✗"}</span><span>{check.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {txDetails?.evaluated && !txDetails.executed && (
              <div className="flex gap-2 mt-4">
                <button onClick={handleApproveTx} disabled={isPending}
                  className="flex-1 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--border)]">
                  Approve ({txDetails.approvalCount}/{txDetails.requiredSigners})
                </button>
                <button onClick={handleExecuteTx} disabled={isPending || txDetails.approvalCount < txDetails.requiredSigners}
                  className="flex-1 px-4 py-2 bg-[var(--accent)] text-black rounded-md hover:opacity-80 disabled:opacity-50">
                  Execute
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "erc20" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">ERC20 Token Transfer</h3>
          <div className="space-y-4">
            <div className="bg-[var(--bg-secondary)] rounded-md p-3 mb-4">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Wallet Balance</div>
              <div className="font-mono text-lg">{tokenBalance} USDC</div>
            </div>
            <input type="text" value={erc20Target} onChange={(e) => setErc20Target(e.target.value)} placeholder="Recipient 0x..."
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md font-mono" />
            <input type="text" value={erc20Amount} onChange={(e) => setErc20Amount(e.target.value)} placeholder="Amount"
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md" />
            <button onClick={handleSubmitErc20} disabled={isPending || !erc20Target || !erc20Amount}
              className="w-full px-4 py-2 bg-[var(--accent)] text-black rounded-md hover:opacity-80 disabled:opacity-50">
              {isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "mint" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Mint USDC</h3>
          <div className="text-sm mb-4">Balance: {tokenBalance} USDC</div>
          <button onClick={handleMintToMultisig} disabled={isPending}
            className="w-full px-4 py-2 bg-[var(--accent)] text-black rounded-md hover:opacity-80">
            {isPending ? "Minting..." : "Mint 100,000 USDC"}
          </button>
        </div>
      )}

      {activeTab === "custom" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Custom Transaction</h3>
          <div className="space-y-4">
            <input type="text" value={customTarget} onChange={(e) => setCustomTarget(e.target.value)} placeholder="Target 0x..."
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md font-mono" />
            <input type="text" value={customValue} onChange={(e) => setCustomValue(e.target.value)} placeholder="Value (0G)"
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md" />
            <input type="text" value={customData} onChange={(e) => setCustomData(e.target.value)} placeholder="0x"
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md font-mono" />
            <button onClick={handleSubmitCustom} disabled={isPending || !customTarget || !customValue}
              className="w-full px-4 py-2 bg-[var(--accent)] text-black rounded-md hover:opacity-80 disabled:opacity-50">
              {isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {hash && (
        <div className="mt-6 bg-[var(--bg-card)] border border-[var(--green)] rounded-lg p-4">
          <h4 className="font-medium text-[var(--green)] mb-2">Transaction Submitted</h4>
          <div className="text-sm text-[var(--text-secondary)] break-all">{hash}</div>
          {isConfirmed && <p className="text-sm text-[var(--green)] mt-2">Confirmed</p>}
        </div>
      )}

      {error && (
        <div className="mt-6 bg-[var(--bg-card)] border border-[var(--red)] rounded-lg p-4">
          <div className="text-sm text-[var(--red)]">{error.message}</div>
        </div>
      )}
    </div>
  );
}
