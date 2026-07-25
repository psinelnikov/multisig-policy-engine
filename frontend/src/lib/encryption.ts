import { encrypt } from "eciesjs";
import { encodeAbiParameters, parseAbiParameters, type Address, hexToBytes, bytesToHex } from "viem";

export interface EvaluateRequest {
  target: Address;
  calldata: `0x${string}`;
  value: bigint;
  sender: Address;
  nonce: bigint;
}

export function encodeEvaluateRequest(request: EvaluateRequest): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters("address target, bytes calldata, uint256 value, address sender, uint256 nonce"),
    [request.target, request.calldata, request.value, request.sender, request.nonce]
  );
}

/// ECIES-encrypt an EvaluateRequest with the evaluator's secp256k1 public key
export function encryptEvaluateRequest(
  evaluatorPublicKey: `0x${string}`,
  request: EvaluateRequest
): `0x${string}` {
  const encoded = encodeEvaluateRequest(request);
  const encodedBytes = hexToBytes(encoded);
  const pubKeyHex = evaluatorPublicKey.startsWith("0x04")
    ? evaluatorPublicKey.slice(4)
    : evaluatorPublicKey.slice(2);
  const encrypted = encrypt(pubKeyHex, encodedBytes);
  return bytesToHex(encrypted);
}

/// The evaluator's ECIES public key, published in env for frontend encryption.
export function getEvaluatorPublicKey(): `0x${string}` {
  const key = import.meta.env.VITE_EVALUATOR_PUB_KEY as string;
  if (!key) throw new Error("VITE_EVALUATOR_PUB_KEY not set");
  return key as `0x${string}`;
}
