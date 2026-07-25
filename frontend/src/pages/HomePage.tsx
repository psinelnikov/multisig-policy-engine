import { useNavigate } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import { ZG_GALILEO_CHAIN, CONTRACTS } from "../lib/constants";
import { WALLET_FACTORY_ABI } from "../lib/abi";
import { useMultisig, type MultisigDeployment } from "../context/MultisigContext";
import { CopyableAddress } from "../components/CopyableAddress";

export default function HomePage() {
  const { address } = useAccount();
  const navigate = useNavigate();
  const { selectMultisig } = useMultisig();

  // Fetch wallets created by the connected user
  const { data: creatorWallets, isLoading } = useReadContract({
    address: CONTRACTS.walletFactory,
    abi: WALLET_FACTORY_ABI,
    functionName: "getWalletsForCreator",
    args: address ? [address] : undefined,
    chainId: ZG_GALILEO_CHAIN.id,
    query: { enabled: !!address },
  });

  const handleSelectMultisig = (multisig: MultisigDeployment) => {
    selectMultisig(multisig);
    navigate("/policies");
  };

  const walletList = (creatorWallets as MultisigDeployment[] | undefined) || [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Multisig Policy Engine</h1>
        <p className="text-lg text-[var(--text-secondary)]">
          Secure, policy-driven multisig wallet management with TEE-powered enforcement
        </p>
      </div>

      {/* User's Multisigs Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Your Multisig Wallets</h2>
          <button
            onClick={() => navigate("/onboarding")}
            className="btn btn-primary"
          >
            + Create New Wallet
          </button>
        </div>

        {!address ? (
          <div className="card text-center py-12">
            <p className="text-[var(--text-secondary)] mb-4">
              Connect your wallet to see your multisig wallets
            </p>
          </div>
        ) : isLoading ? (
          <div className="card text-center py-12">
            <p className="text-[var(--text-secondary)]">Loading your wallets...</p>
          </div>
        ) : walletList.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-[var(--text-secondary)] mb-4">
              You haven't created any multisig wallets yet
            </p>
            <button
              onClick={() => navigate("/onboarding")}
              className="btn btn-primary"
            >
              Create Your First Wallet
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {walletList.map((wallet, index) => (
              <MultisigCard
                key={index}
                wallet={wallet}
                index={index}
                onSelect={() => handleSelectMultisig(wallet)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
        <FeatureCard
          title="Policy Enforcement"
          description="Define granular policies with risk weights, allowlists, denylists, and spending limits"
        />
        <FeatureCard
          title="Audit Trail"
          description="Complete audit log of all policy evaluations and transaction checks"
        />
        <FeatureCard
          title="Governance"
          description="Multi-signature governance for policy changes and wallet administration"
        />
      </div>
    </div>
  );
}

function MultisigCard({
  wallet,
  index,
  onSelect,
}: {
  wallet: MultisigDeployment;
  index: number;
  onSelect: () => void;
}) {
  return (
    <div className="card hover:border-[var(--accent)] transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Wallet #{index + 1}</h3>
          <div className="space-y-1 text-sm">
            <p className="text-[var(--text-secondary)]">
              <span className="font-medium">Address:</span>{" "}
              <CopyableAddress address={wallet.wallet} />
            </p>
          </div>
        </div>
        <button onClick={onSelect} className="btn btn-primary">
          Select
        </button>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="card">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
