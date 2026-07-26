import { ethers } from "ethers";
import { ZG_RPC_URL, ZG_STORAGE_INDEXER_URL, EVALUATOR_PRIVATE_KEY } from "./config.js";

/// Upload a full audit receipt to 0G Storage. Returns the Merkle root hash.
/// Fail-open: returns zero hash if upload fails.
export async function uploadReceipt(receipt: object): Promise<string> {
  try {
    const { Indexer, MemData } = await import("@0gfoundation/0g-ts-sdk");

    const indexer = new Indexer(ZG_STORAGE_INDEXER_URL);
    const provider = new ethers.JsonRpcProvider(ZG_RPC_URL);
    const signer = new ethers.Wallet(EVALUATOR_PRIVATE_KEY, provider);

    const fullReceipt = JSON.stringify(receipt);
    const memData = new MemData(new TextEncoder().encode(fullReceipt));

    const [tree, _err] = await (memData as any).merkleTree();
    const rootHash = tree.rootHash();

    const [tx, uploadErr] = await (indexer as any).upload(memData, ZG_RPC_URL, signer);
    if (uploadErr) {
      console.warn("[storage] Upload error:", uploadErr);
      return ethers.ZeroHash;
    }

    console.log(`[storage] Uploaded receipt, root=${rootHash}, tx=${tx}`);
    return rootHash as string;
  } catch (err) {
    console.warn("[storage] Upload failed (fail-open):", err instanceof Error ? err.message : err);
    return ethers.ZeroHash;
  }
}

/// Download a receipt from 0G Storage by root hash. Used by the proxy server.
export async function downloadReceipt(rootHash: string): Promise<object | null> {
  try {
    const { Indexer } = await import("@0gfoundation/0g-ts-sdk");
    const indexer = new Indexer(ZG_STORAGE_INDEXER_URL);

    const data = await (indexer as any).downloadData(rootHash);
    if (!data) return null;

    const text = new TextDecoder().decode(data);
    return JSON.parse(text);
  } catch (err) {
    console.error("[storage] Download failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
