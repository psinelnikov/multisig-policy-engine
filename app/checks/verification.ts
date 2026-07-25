import { EXPLORER_API_URL } from "../config.js";

/// Check if contract is verified via block explorer API.
/// 0G chainscan-galileo: https://chainscan-galileo.0g.ai/open/api
/// Fail-open: throws on API error so simulation excludes this check.
export async function checkContractVerified(target: `0x${string}`): Promise<[boolean, number]> {
  const url = `${EXPLORER_API_URL}?module=contract&action=getabi&address=${target}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const json = await response.json();
  const verified = json.status === "1" || json.message === "OK";
  return [verified, verified ? 0 : 75];
}
