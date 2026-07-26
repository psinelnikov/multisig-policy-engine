import { useChainId } from "wagmi";
import { ZG_GALILEO_CHAIN } from "../lib/constants";

export function NetworkStatus() {
  const chainId = useChainId();
  const isCorrectNetwork = chainId === ZG_GALILEO_CHAIN.id;

  if (isCorrectNetwork) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-xs text-green-500 font-medium">
          0G Galileo
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full">
      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
      <span className="text-xs text-orange-500 font-medium">
        Wrong Network
      </span>
    </div>
  );
}
