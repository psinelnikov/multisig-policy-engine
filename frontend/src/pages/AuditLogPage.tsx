import { useState } from "react";
import { useReadContracts } from "wagmi";
import { ZG_GALILEO_CHAIN, riskColor, riskLabel, formatTimestamp, decodeCheckResults } from "../lib/constants";
import { AUDIT_LOG_ABI } from "../lib/abi";
import { Link } from "react-router-dom";
import { useMultisig } from "../context/MultisigContext";

export default function AuditLogPage() {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const { selectedMultisig, hasSelection } = useMultisig();

  // Redirect to home if no multisig selected
  if (!hasSelection) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">No Multisig Selected</h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Please select a multisig wallet to view its audit log
        </p>
        <Link to="/" className="btn btn-primary">
          Go to Home
        </Link>
      </div>
    );
  }

  const auditLogAddress = selectedMultisig!.auditLog;

  const { data: countData, isLoading: countLoading } = useReadContracts({
    contracts: [
      {
        address: auditLogAddress,
        abi: AUDIT_LOG_ABI,
        functionName: "getEntryCount",
        chainId: ZG_GALILEO_CHAIN.id,
      },
    ],
  });

  const total = countData?.[0]?.result as bigint | undefined;
  const totalPages = total ? Math.ceil(Number(total) / PAGE_SIZE) : 0;

  const { data: entries, isLoading } = useReadContracts({
    contracts: total
      ? Array.from(
          { length: Math.min(PAGE_SIZE, Number(total) - page * PAGE_SIZE) },
          (_, i) => ({
            address: auditLogAddress,
            abi: AUDIT_LOG_ABI,
            functionName: "getEntry",
            args: [BigInt(page * PAGE_SIZE + i)] as const,
            chainId: ZG_GALILEO_CHAIN.id,
          })
        )
      : [],
    query: { enabled: !!total },
  });

  const [selectedEntry, setSelectedEntry] = useState<number | null>(null);
  const entryList = (entries || []).map((e) => e.result as any).filter(Boolean);

  const selectedData = selectedEntry !== null ? entryList[selectedEntry] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Audit Log</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {total !== undefined ? `${total} evaluation${total !== 1n ? "s" : ""} recorded` : "Loading..."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoading || countLoading ? (
            <div className="card text-center py-12 text-[var(--text-secondary)]">
              Loading entries...
            </div>
          ) : entryList.length === 0 ? (
            <div className="card text-center py-12 text-[var(--text-secondary)]">
              No audit entries yet.
            </div>
          ) : (
            <div className="space-y-2">
              {entryList.map((entry: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedEntry(idx)}
                  className={`w-full text-left card hover:border-[var(--accent)] transition-colors ${
                    selectedEntry === idx ? "border-[var(--accent)]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{ background: `${riskColor(entry.riskScore)}20`, color: riskColor(entry.riskScore) }}
                      >
                        {Number(entry.riskScore)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {entry.policyName || `Policy #${entry.policyId}`}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {formatTimestamp(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className="badge text-xs"
                        style={{
                          background: `${riskColor(entry.riskScore)}20`,
                          color: riskColor(entry.riskScore),
                        }}
                      >
                        {riskLabel(entry.riskScore)}
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {Number(entry.requiredSigners)}-of-{Number(entry.totalSigners)} signers
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="btn btn-secondary btn-sm"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-[var(--text-secondary)]">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="btn btn-secondary btn-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          {selectedData ? (
            <div className="card sticky top-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                Entry Detail
              </h3>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[var(--text-secondary)]">Evaluation ID</dt>
                  <dd className="font-mono text-xs break-all mt-0.5">{selectedData.evaluationId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Policy</dt>
                  <dd>{selectedData.policyName || `#${selectedData.policyId}`}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-secondary)] mb-1">Risk Score</dt>
                  <dd>
                    <div className="flex items-center gap-2">
                      <div className="risk-bar flex-1">
                        <div
                          className="risk-bar-fill"
                          style={{
                            width: `${Number(selectedData.riskScore)}%`,
                            background: riskColor(Number(selectedData.riskScore)),
                          }}
                        />
                      </div>
                      <span className="font-mono text-xs" style={{ color: riskColor(Number(selectedData.riskScore)) }}>
                        {Number(selectedData.riskScore)}%
                      </span>
                    </div>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Threshold</dt>
                  <dd>{Number(selectedData.requiredSigners)}-of-{Number(selectedData.totalSigners)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Timestamp</dt>
                  <dd className="text-xs">{formatTimestamp(selectedData.timestamp)}</dd>
                </div>
              </dl>

              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Check Results
                </h4>
                <div className="space-y-1">
                  {decodeCheckResults(Number(selectedData.checkResults)).map((check) => (
                    <div key={check.bit} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">{check.label}</span>
                      <span
                        className="font-semibold"
                        style={{ color: check.pass ? "var(--green)" : "var(--red)" }}
                      >
                        {check.pass ? "PASS" : "FAIL"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12 text-[var(--text-secondary)] text-sm">
              Select an entry to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
