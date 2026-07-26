import { useState } from "react";
import { useReadContracts, useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { ZG_GALILEO_CHAIN, shortAddress, formatTimestamp, GALILEO_MAX_FEE, GALILEO_PRIORITY_FEE } from "../lib/constants";
import { CopyableAddress } from "../components/CopyableAddress";
import { GOVERNANCE_MULTISIG_ABI, POLICY_REGISTRY_ABI } from "../lib/abi";
import { encodeFunctionData, decodeFunctionData, type Hex } from "viem";
import { Link } from "react-router-dom";
import { useMultisig } from "../context/MultisigContext";

const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;

export default function GovernancePage() {
  const { address } = useAccount();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { selectedMultisig, hasSelection } = useMultisig();

  // Redirect to home if no multisig selected
  if (!hasSelection) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">No Multisig Selected</h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Please select a multisig wallet to view its governance proposals
        </p>
        <Link to="/" className="btn btn-primary">
          Go to Home
        </Link>
      </div>
    );
  }

  const governanceAddress = selectedMultisig!.governance;
  const policyRegistryAddress = selectedMultisig!.policyRegistry;

  const { data: proposalCountData } = useReadContract({
    address: governanceAddress,
    abi: GOVERNANCE_MULTISIG_ABI,
    functionName: "proposalCount",
    chainId: ZG_GALILEO_CHAIN.id,
  });

  const proposalCount = proposalCountData ? Number(proposalCountData) : 0;

  const { data: signerCountData } = useReadContract({
    address: governanceAddress,
    abi: GOVERNANCE_MULTISIG_ABI,
    functionName: "getSignerCount",
    chainId: ZG_GALILEO_CHAIN.id,
  });

  const totalSigners = signerCountData ? Number(signerCountData) : 0;

  const { data: proposals } = useReadContracts({
    contracts: Array.from({ length: proposalCount }, (_, i) => ({
      address: governanceAddress,
      abi: GOVERNANCE_MULTISIG_ABI,
      functionName: "getProposal",
      args: [BigInt(i)] as const,
      chainId: ZG_GALILEO_CHAIN.id,
    })),
    query: { enabled: proposalCount > 0 },
  });

  const proposalList = (proposals || [])
    .map((p, i) => ({ ...(p.result as any), index: i }))
    .filter((p) => p.id !== undefined)
    .reverse();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Governance</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {proposalCount} proposal{proposalCount !== 1 ? "s" : ""} &middot; {totalSigners} signer{totalSigners !== 1 ? "s" : ""} (unanimous required)
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? "Cancel" : "+ New Proposal"}
        </button>
      </div>

      {showCreateForm && (
        <CreateProposalForm 
          onClose={() => setShowCreateForm(false)} 
          governanceAddress={governanceAddress}
          policyRegistryAddress={policyRegistryAddress}
        />
      )}

      {proposalList.length === 0 ? (
        <div className="card text-center py-12 text-[var(--text-secondary)]">
          No governance proposals yet.
        </div>
      ) : (
        <div className="space-y-3">
          {proposalList.map((proposal: any) => (
            <ProposalRow
              key={proposal.index}
              proposal={proposal}
              totalSigners={totalSigners}
              userAddress={address}
              governanceAddress={governanceAddress}
              policyRegistryAddress={policyRegistryAddress}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProposalRow({ proposal, totalSigners, userAddress, governanceAddress, policyRegistryAddress }: { proposal: any; totalSigners: number; userAddress?: `0x${string}`; governanceAddress: `0x${string}`; policyRegistryAddress: `0x${string}` }) {
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: hasApproved } = useReadContract({
    address: governanceAddress,
    abi: GOVERNANCE_MULTISIG_ABI,
    functionName: "hasApproved",
    args: [proposal.id, userAddress ?? "0x0000000000000000000000000000000000000000"],
    chainId: ZG_GALILEO_CHAIN.id,
  });

  const canApprove = !proposal.executed && !hasApproved && userAddress;
  const canExecute = proposal.executed === false && proposal.approvalCount >= totalSigners && userAddress;

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">#{proposal.id} {proposal.description}</h3>
            {proposal.executed ? (
              <span className="badge badge-green">Executed</span>
            ) : proposal.approvalCount >= totalSigners ? (
              <span className="badge badge-yellow">Ready</span>
            ) : (
              <span className="badge badge-blue">Pending</span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Target: <CopyableAddress address={proposal.target} />
            &middot; Approvals: {Number(proposal.approvalCount)}/{totalSigners}
            &middot; Created: Block {Number(proposal.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <button
              onClick={() =>
                writeContract({
                  address: governanceAddress,
                  abi: GOVERNANCE_MULTISIG_ABI,
                  functionName: "approve",
                  args: [proposal.id],
                  chainId: ZG_GALILEO_CHAIN.id,
                  maxFeePerGas: GALILEO_MAX_FEE,
                  maxPriorityFeePerGas: GALILEO_PRIORITY_FEE,
                })
              }
              disabled={isConfirming}
              className="btn btn-primary btn-sm"
            >
              {isConfirming ? "Confirming..." : "Approve"}
            </button>
          )}
          {canExecute && (
            <button
              onClick={() =>
                writeContract({
                  address: governanceAddress,
                  abi: GOVERNANCE_MULTISIG_ABI,
                  functionName: "execute",
                  args: [proposal.id],
                  chainId: ZG_GALILEO_CHAIN.id,
                  maxFeePerGas: GALILEO_MAX_FEE,
                  maxPriorityFeePerGas: GALILEO_PRIORITY_FEE,
                })
              }
              disabled={isConfirming}
              className="btn btn-primary btn-sm"
            >
              {isConfirming ? "Confirming..." : "Execute"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="risk-bar">
          <div
            className="risk-bar-fill"
            style={{
              width: `${(Number(proposal.approvalCount) / totalSigners) * 100}%`,
              background: Number(proposal.approvalCount) >= totalSigners ? "var(--green)" : "var(--accent)",
            }}
          />
        </div>
      </div>

      {/* Policy Details Section - only for policy registry proposals */}
      <PolicyProposalDetails 
        target={proposal.target} 
        data={proposal.data} 
        policyRegistryAddress={policyRegistryAddress}
      />
    </div>
  );
}

function PolicyProposalDetails({ target, data, policyRegistryAddress }: { target: `0x${string}`; data: `0x${string}`; policyRegistryAddress: `0x${string}` }) {
  // Only show details for policy registry proposals
  if (target.toLowerCase() !== policyRegistryAddress.toLowerCase()) {
    return null;
  }

  // Try to decode the policy proposal data
  let policyDetails: any = null;
  try {
    const decoded = decodeFunctionData({
      abi: POLICY_REGISTRY_ABI,
      data: data,
    });
    
    if (decoded.functionName === "addPolicy" && decoded.args) {
      const [name, conditions, limits, signers, riskWeight] = decoded.args as [
        string,
        { targetAddresses: `0x${string}`[]; functionSelectors: `0x${string}`[]; minValue: bigint; maxValue: bigint; timeWindowStart: bigint; timeWindowEnd: bigint; requireVerified: boolean; requireErc7730: boolean },
        { maxValuePerTxUsd: bigint; maxValueDailyUsd: bigint; allowlist: `0x${string}`[]; denylist: `0x${string}`[] },
        `0x${string}`[],
        number
      ];
      
      policyDetails = {
        name,
        conditions,
        limits,
        signers,
        riskWeight,
      };
    }
  } catch {
    // Not a decodable policy proposal
    return null;
  }

  if (!policyDetails) return null;

  const { name, conditions, limits, signers, riskWeight } = policyDetails;

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)]">
      <h4 className="text-sm font-semibold text-[var(--accent)] mb-3">
        Policy Proposal: {name} (Risk {riskWeight}/10)
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Conditions Card */}
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
          <h5 className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">Conditions</h5>
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Targets</dt>
              <dd>{conditions.targetAddresses.length === 0 ? "Any" : `${conditions.targetAddresses.length} addresses`}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Min Value</dt>
              <dd>{conditions.minValue > 0n ? conditions.minValue.toString() : "Any"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Max Value</dt>
              <dd>{conditions.maxValue === MAX_UINT256 ? "Infinite" : conditions.maxValue > 0n ? conditions.maxValue.toString() : "No cap"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Verified</dt>
              <dd>{conditions.requireVerified ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">ERC-7730</dt>
              <dd>{conditions.requireErc7730 ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </div>

        {/* Limits Card */}
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
          <h5 className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">Limits</h5>
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Max Per-Tx</dt>
              <dd>{limits.maxValuePerTxUsd === MAX_UINT256 ? "Infinite" : limits.maxValuePerTxUsd > 0n ? `$${formatUsd(limits.maxValuePerTxUsd)}` : "Unlimited"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Max Daily</dt>
              <dd>{limits.maxValueDailyUsd === MAX_UINT256 ? "Infinite" : limits.maxValueDailyUsd > 0n ? `$${formatUsd(limits.maxValueDailyUsd)}` : "Unlimited"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Allowlist</dt>
              <dd>{limits.allowlist.length === 0 ? "None" : `${limits.allowlist.length} addresses`}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Denylist</dt>
              <dd className="text-[var(--red)]">{limits.denylist.length === 0 ? "None" : `${limits.denylist.length} addresses`}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Signers</dt>
              <dd>{signers.length} required</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function formatUsd(val: bigint): string {
  const num = Number(val) / 1e18;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
}

function CreateProposalForm({ 
  onClose, 
  governanceAddress, 
  policyRegistryAddress 
}: { 
  onClose: () => void; 
  governanceAddress: `0x${string}`; 
  policyRegistryAddress: `0x${string}` 
}) {
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [name, setName] = useState("");
  const [maxPerTx, setMaxPerTx] = useState("");
  const [maxDaily, setMaxDaily] = useState("");
  const [riskWeight, setRiskWeight] = useState("5");
  const [signers, setSigners] = useState("");
  const [allowlist, setAllowlist] = useState("");
  const [denylist, setDenylist] = useState("");
  const [requireVerified, setRequireVerified] = useState(false);
  const [requireErc7730, setRequireErc7730] = useState(false);

  if (isSuccess) {
    return (
      <div className="card mb-6 text-center py-8">
        <p className="text-[var(--green)] font-semibold">Proposal submitted successfully!</p>
        <button onClick={onClose} className="btn btn-secondary mt-3">Close</button>
      </div>
    );
  }

  const handleSubmit = () => {
    const signerAddrs = signers.split(",").map((s) => s.trim() as `0x${string}`).filter(Boolean);
    const allowAddrs = allowlist.split(",").map((s) => s.trim() as `0x${string}`).filter(Boolean);
    const denyAddrs = denylist.split(",").map((s) => s.trim() as `0x${string}`).filter(Boolean);

    const calldata = encodeFunctionData({
      abi: POLICY_REGISTRY_ABI,
      functionName: "addPolicy",
      args: [
        name,
        {
          targetAddresses: [],
          functionSelectors: [],
          minValue: 0n,
          maxValue: 0n,
          timeWindowStart: 0n,
          timeWindowEnd: 0n,
          requireVerified,
          requireErc7730,
        },
        {
          maxValuePerTxUsd: maxPerTx ? BigInt(Number(maxPerTx) * 1e18) : 0n,
          maxValueDailyUsd: maxDaily ? BigInt(Number(maxDaily) * 1e18) : 0n,
          allowlist: allowAddrs,
          denylist: denyAddrs,
        },
        signerAddrs,
        Number(riskWeight),
      ],
    });

    writeContract({
      address: governanceAddress,
      abi: GOVERNANCE_MULTISIG_ABI,
      functionName: "propose",
      args: [
        policyRegistryAddress as Hex,
        calldata as Hex,
        `Add policy: ${name}`,
      ],
      chainId: ZG_GALILEO_CHAIN.id,
      maxFeePerGas: GALILEO_MAX_FEE,
      maxPriorityFeePerGas: GALILEO_PRIORITY_FEE,
    });
  };

  return (
    <div className="card mb-6">
      <h3 className="text-lg font-semibold mb-4">Propose New Policy</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1 block">Policy Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Treasury Policy" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1 block">Risk Weight (1-10)</label>
          <input type="number" min={1} max={10} value={riskWeight} onChange={(e) => setRiskWeight(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1 block">Max Per-Tx (USD)</label>
          <input type="number" value={maxPerTx} onChange={(e) => setMaxPerTx(e.target.value)} placeholder="e.g. 5000" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1 block">Max Daily (USD)</label>
          <input type="number" value={maxDaily} onChange={(e) => setMaxDaily(e.target.value)} placeholder="e.g. 50000" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-[var(--text-secondary)] mb-1 block">Signers (comma-separated addresses)</label>
          <input value={signers} onChange={(e) => setSigners(e.target.value)} placeholder="0xAddr1, 0xAddr2, 0xAddr3" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-[var(--text-secondary)] mb-1 block">Allowlist (comma-separated, optional)</label>
          <input value={allowlist} onChange={(e) => setAllowlist(e.target.value)} placeholder="0xAddr1, 0xAddr2" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-[var(--text-secondary)] mb-1 block">Denylist (comma-separated, optional)</label>
          <input value={denylist} onChange={(e) => setDenylist(e.target.value)} placeholder="0xAddr1, 0xAddr2" />
        </div>
        <div className="md:col-span-2">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="reqVer" checked={requireVerified} onChange={(e) => setRequireVerified(e.target.checked)} style={{ width: '4%' }} />
          <label htmlFor="reqVer" className="text-sm whitespace-nowrap">Require Contract Verification</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="req7730" checked={requireErc7730} onChange={(e) => setRequireErc7730(e.target.checked)} style={{ width: '4%' }} />
          <label htmlFor="req7730" className="text-sm whitespace-nowrap">Require ERC-7730 Descriptor</label>
        </div>
         </div>

      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleSubmit}
          disabled={!name || !signers || isConfirming}
          className="btn btn-primary"
        >
          {isConfirming ? "Confirming..." : "Submit Proposal"}
        </button>
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
