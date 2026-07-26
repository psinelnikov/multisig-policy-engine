import { COINGECKO_API_URL } from "../config.js";

let cachedPrice: bigint | null = null;
let cachedTimestamp: number = 0;
const CACHE_TTL = 30;

/// Fetch 0G/USD price from CoinGecko. Returns price in 1e18 wei.
/// Fail-open: throws on API error so caller can handle.
export async function fetchNativePrice(): Promise<bigint> {
  if (cachedPrice !== null && Date.now() / 1000 - cachedTimestamp < CACHE_TTL) {
    return cachedPrice;
  }

  const resp = await fetch(
    `${COINGECKO_API_URL}/simple/price?ids=zero-gravity&vs_currencies=usd`,
    { signal: AbortSignal.timeout(5000) }
  );
  const data = await resp.json();
  const priceUsd = data["zero-gravity"]?.usd;
  if (!priceUsd) throw new Error("CoinGecko: no zero-gravity price");

  cachedPrice = BigInt(Math.floor(priceUsd * 1e18));
  cachedTimestamp = Math.floor(Date.now() / 1000);
  return cachedPrice;
}
