import { decrypt } from "eciesjs";
import { hexToBytes } from "../base/utils.js";

/// ECIES-decrypt an EvaluateRequest payload using the evaluator's private key.
export function decryptPayload(encryptedHex: string, privateKeyHex: string): Uint8Array {
  const encryptedBytes = hexToBytes(encryptedHex as `0x${string}`);
  const privKey = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;
  return decrypt(privKey, encryptedBytes);
}
