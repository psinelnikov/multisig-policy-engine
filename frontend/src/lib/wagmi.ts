import { http, createConfig } from "wagmi";
import { ZG_GALILEO_CHAIN } from "./constants";

export const wagmiConfig = createConfig({
  chains: [ZG_GALILEO_CHAIN],
  transports: {
    [ZG_GALILEO_CHAIN.id]: http(),
  },
  ssr: false,
});
