import { useReadContracts } from "wagmi";
import { ZG_GALILEO_CHAIN, shortAddress, riskLabel } from "../lib/constants";
import { CopyableAddress } from "../components/CopyableAddress";
import { POLICY_REGISTRY_ABI } from "../lib/abi";
import { Link, Navigate } from "react-router-dom";
import { useMultisig } from "../context/MultisigContext";

const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;

export default function PoliciesPage() {
  const { selectedMultisig, hasSelection } = useMultisig();

  // Redirect to home if no multisig selected
  if (!hasSelection) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">No Multisig Selected</h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Please select a multisig wallet to view its policies
        </p>
        <Link to="/" className="btn btn-primary">
          Go to Home
        </Link>
      </div>
    );
  }

  const policyRegistryAddress = selectedMultisig!.policyRegistry;

  const { data: countData, isLoading } = useReadContracts({
    contracts: [
      {
        address: policyRegistryAddress,
        abi: POLICY_REGISTRY_ABI,
        functionName: "getPolicyCount",
        chainId: ZG_GALILEO_CHAIN.id,
      },
    ],
  });

  const count = countData?.[0]?.result as bigint | undefined;

  const { data: policies } = useReadContracts({
    contracts: count
      ? Array.from({ length: Number(count) }, (_, i) => ({
          address: policyRegistryAddress,
          abi: POLICY_REGISTRY_ABI,
          functionName: "getPolicy",
          args: [BigInt(i)] as const,
          chainId: ZG_GALILEO_CHAIN.id,
        }))
      : [],
    query: { enabled: !!count },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[var(--text-secondary)]">Loading policies...</div>
      </div>
    );
  }

  const policyList = (policies || [])
    .map((p) => p.result as any)
    .filter(Boolean);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Policies</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {policyList.length} policy{policyList.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Link to="/governance" className="btn btn-primary">
          + Propose Policy
        </Link>
      </div>

      {policyList.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-[var(--text-secondary)]">
            No policies found. Create one through governance.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {policyList.map((policy: any, idx: number) => (
            <Link
              key={idx}
              to={`/policy/${policy.id}`}
              className="card hover:border-[var(--accent)] transition-colors block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{policy.name}</h3>
                    <span
                      className={`badge ${
                        policy.active ? "badge-green" : "badge-red"
                      }`}
                    >
                      {policy.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    ID: {policy.id.toString()} &middot; Risk Weight: {policy.riskWeight}/10
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Max Per-Tx
                  </p>
                  <p className="text-sm font-mono">
                    {policy.limits.maxValuePerTxUsd === MAX_UINT256 ? "Infinite" : policy.limits.maxValuePerTxUsd > 0n ? `$${formatUsd(policy.limits.maxValuePerTxUsd)}` : "Unlimited"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-6 text-xs text-[var(--text-secondary)]">
                {policy.conditions.requireVerified && (
                  <span className="badge badge-blue">Verified Required</span>
                )}
                {policy.conditions.requireErc7730 && (
                  <span className="badge badge-yellow">ERC-7730 Required</span>
                )}
                {policy.limits.allowlist.length > 0 && (
                  <span>Allowlist: {policy.limits.allowlist.length}</span>
                )}
                {policy.limits.denylist.length > 0 && (
                  <span className="text-[var(--red)]">
                    Denylist: {policy.limits.denylist.length}
                  </span>
                )}
                {policy.conditions.targetAddresses.length > 0 && (
                  <span>
                    Targets:{" "}
                    {policy.conditions.targetAddresses
                      .map((a: string) => <CopyableAddress key={a} address={a} />)
                      .reduce((prev: React.ReactNode, curr: React.ReactNode, i: number) => (
                        <>{prev}{i > 0 ? ", " : ""}{curr}</>
                      ), null)}
                  </span>
                )}
                {policy.conditions.functionSelectors.length > 0 && (
                  <span>
                    Selectors: {policy.conditions.functionSelectors.join(", ")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatUsd(val: bigint): string {
  const num = Number(val) / 1e18;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
}
