import * as crypto from "node:crypto";
import { sha256 } from "./hash";

export interface KeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
  fingerprint: string;
}

export function generateEd25519KeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const fingerprint = computePublicKeyFingerprint(publicKey);

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    fingerprint,
  };
}

export function computePublicKeyFingerprint(publicKeyPem: string): string {
  // Normalize PEM by stripping headers/footers and whitespace before hashing
  const cleanKey = publicKeyPem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");

  const hash = sha256(cleanKey);
  return `SHA256:${hash.slice(0, 32)}`;
}

export function signData(privateKeyPem: string, data: string | Buffer): string {
  const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const signature = crypto.sign(null, bufferData, privateKeyPem);
  return signature.toString("base64");
}

export function verifyData(
  publicKeyPem: string,
  data: string | Buffer,
  signatureBase64: string,
): boolean {
  try {
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const signature = Buffer.from(signatureBase64, "base64");
    return crypto.verify(null, bufferData, publicKeyPem, signature);
  } catch {
    return false;
  }
}

export function signDeviceChallenge(privateKeyPem: string, challenge: string): string {
  return signData(privateKeyPem, `NEXUSDESK_CHALLENGE:${challenge}`);
}

export function verifyDeviceChallenge(
  publicKeyPem: string,
  challenge: string,
  signatureBase64: string,
): boolean {
  return verifyData(publicKeyPem, `NEXUSDESK_CHALLENGE:${challenge}`, signatureBase64);
}
