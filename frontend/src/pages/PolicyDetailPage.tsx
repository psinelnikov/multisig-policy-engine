import { useParams, Link } from "react-router-dom";
import { useReadContract } from "wagmi";
import { ZG_GALILEO_CHAIN, shortAddress, formatTimestamp, decodeCheckResults } from "../lib/constants";
import { CopyableAddress } from "../components/CopyableAddress";
import { POLICY_REGISTRY_ABI } from "../lib/abi";
import { useMultisig } from "../context/MultisigContext";

const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const policyId = BigInt(id ?? "0");
  const { selectedMultisig, hasSelection } = useMultisig();

  // Redirect to home if no multisig selected
  if (!hasSelection) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">No Multisig Selected</h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Please select a multisig wallet to view policy details
        </p>
        <Link to="/" className="btn btn-primary">
          Go to Home
        </Link>
      </div>
    );
  }

  const policyRegistryAddress = selectedMultisig!.policyRegistry;

  const { data: policy, isLoading } = useReadContract({
    address: policyRegistryAddress,
    abi: POLICY_REGISTRY_ABI,
    functionName: "getPolicy",
    args: [policyId],
    chainId: ZG_GALILEO_CHAIN.id,
  });

  if (isLoading || !policy) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[var(--text-secondary)]">Loading policy...</div>
      </div>
    );
  }

  const p = policy as any;

  return (
    <div>
      <Link to="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] mb-4 inline-block">
        &larr; Back to Policies
      </Link>

      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{p.name}</h2>
              <span className={`badge ${p.active ? "badge-green" : "badge-red"}`}>
                {p.active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Policy ID: {p.id.toString()} &middot; Risk Weight: {p.riskWeight}/10
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Conditions
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Target Addresses</dt>
              <dd>{p.conditions.targetAddresses.length === 0 ? "Any" : p.conditions.targetAddresses.map((a: string) => <CopyableAddress key={a} address={a} />).reduce((prev: React.ReactNode, curr: React.ReactNode, i: number) => <>{prev}{i > 0 ? ", " : ""}{curr}</>, null)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Function Selectors</dt>
              <dd>{p.conditions.functionSelectors.length === 0 ? "Any" : p.conditions.functionSelectors.join(", ")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Min Value</dt>
              <dd>{p.conditions.minValue > 0n ? p.conditions.minValue.toString() : "Any"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Max Value</dt>
              <dd>{p.conditions.maxValue === MAX_UINT256 ? "Infinite" : p.conditions.maxValue > 0n ? p.conditions.maxValue.toString() : "No cap"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Require Verified</dt>
              <dd>{p.conditions.requireVerified ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Require ERC-7730</dt>
              <dd>{p.conditions.requireErc7730 ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Limits
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Max Per-Tx (USD)</dt>
              <dd>{p.limits.maxValuePerTxUsd === MAX_UINT256 ? "Infinite" : p.limits.maxValuePerTxUsd > 0n ? `$${formatUsd(p.limits.maxValuePerTxUsd)}` : "Unlimited"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Max Daily (USD)</dt>
              <dd>{p.limits.maxValueDailyUsd === MAX_UINT256 ? "Infinite" : p.limits.maxValueDailyUsd > 0n ? `$${formatUsd(p.limits.maxValueDailyUsd)}` : "Unlimited"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Allowlist</dt>
              <dd>{p.limits.allowlist.length === 0 ? "None" : p.limits.allowlist.map((a: string) => <CopyableAddress key={a} address={a} />).reduce((prev: React.ReactNode, curr: React.ReactNode, i: number) => <>{prev}{i > 0 ? ", " : ""}{curr}</>, null)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Denylist</dt>
              <dd className="text-[var(--red)]">
                {p.limits.denylist.length === 0 ? "None" : p.limits.denylist.map((a: string) => <CopyableAddress key={a} address={a} />).reduce((prev: React.ReactNode, curr: React.ReactNode, i: number) => <>{prev}{i > 0 ? ", " : ""}{curr}</>, null)}
              </dd>
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
