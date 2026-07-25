import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { ZG_GALILEO_CHAIN, shortAddress } from "../lib/constants";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address, chainId: ZG_GALILEO_CHAIN.id });
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();

  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: ZG_GALILEO_CHAIN.id });
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  const isWrongNetwork = chainId !== ZG_GALILEO_CHAIN.id;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {isWrongNetwork && (
          <button
            onClick={handleSwitchNetwork}
            className="btn btn-warning btn-sm"
          >
            Switch to Coston2
          </button>
        )}
        {balance && !isWrongNetwork && (
          <span className="text-xs text-[var(--text-secondary)]">
            {Number.parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)} C2FLR
          </span>
        )}
        <a
          href={`https://coston2-explorer.flare.network/address/${address}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-mono text-[var(--text-primary)] hover:text-[var(--accent)]"
        >
          {shortAddress(address)}
        </a>
        <button
          onClick={() => disconnect()}
          className="btn btn-secondary btn-sm"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Find MetaMask connector first, fallback to any available connector
  const metaMaskConnector = connectors.find(c => c.name.toLowerCase().includes('metamask'));
  const primaryConnector = metaMaskConnector || connectors[0];

  if (!primaryConnector) {
    return null;
  }

  return (
    <button
      onClick={() => connect({ connector: primaryConnector, chainId: ZG_GALILEO_CHAIN.id })}
      className="btn btn-primary"
    >
      Connect Wallet
    </button>
  );
}
