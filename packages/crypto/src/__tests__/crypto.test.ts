import { describe, it, expect } from "vitest";
import { generateEd25519KeyPair, computePublicKeyFingerprint } from "../keys";
import { generateDeviceId, generateSecureToken, generateSessionId } from "../random";
import { sha256, secureCompare } from "../hash";

describe("Crypto Package", () => {
  it("generates valid Ed25519 keypair and computed fingerprint", () => {
    const keyPair = generateEd25519KeyPair();
    expect(keyPair.publicKeyPem).toContain("BEGIN PUBLIC KEY");
    expect(keyPair.privateKeyPem).toContain("BEGIN PRIVATE KEY");
    expect(keyPair.fingerprint).toMatch(/^SHA256:[a-f0-9]{32}$/);

    const recomputed = computePublicKeyFingerprint(keyPair.publicKeyPem);
    expect(recomputed).toBe(keyPair.fingerprint);
  });

  it("generates correct device ID format NXD-XXXX-XXXX", () => {
    const deviceId = generateDeviceId();
    expect(deviceId).toMatch(/^NXD-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("generates random secure tokens and session IDs", () => {
    const token = generateSecureToken(16);
    expect(token).toHaveLength(32); // 16 bytes = 32 hex chars

    const sessionId = generateSessionId();
    expect(sessionId).toMatch(/^ses_[0-9a-f-]{36}$/);
  });

  it("performs sha256 and secure comparison", () => {
    const hash = sha256("test-data");
    expect(hash).toHaveLength(64);
    expect(secureCompare("secret", "secret")).toBe(true);
    expect(secureCompare("secret", "different")).toBe(false);
  });
});
