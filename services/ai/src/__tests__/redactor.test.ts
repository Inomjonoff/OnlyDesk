import { describe, it, expect } from "vitest";
import {
  redactSecretsFromText,
  redactSecretsFromObject,
  redactProcessCommandLine,
} from "../redactor";

describe("Secret Redactor", () => {
  it("should redact API keys, Bearer tokens, and JWTs from strings", () => {
    const textWithBearer = "Authorization: Bearer mySecretToken12345678";
    expect(redactSecretsFromText(textWithBearer)).toContain("[REDACTED_SECRET]");
    expect(redactSecretsFromText(textWithBearer)).not.toContain("mySecretToken12345678");

    const textWithJwt =
      "Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature";
    expect(redactSecretsFromText(textWithJwt)).toContain("[REDACTED_SECRET]");
  });

  it("should redact AWS keys and DB connection strings", () => {
    const aws = "Access key is AKIAIOSFODNN7EXAMPLE for deployment";
    expect(redactSecretsFromText(aws)).toContain("[REDACTED_SECRET]");
    expect(redactSecretsFromText(aws)).not.toContain("AKIAIOSFODNN7EXAMPLE");

    const db =
      "Connect to postgres://nexus_admin:superSecretPass123@db.prod.internal:5432/nexusdesk";
    expect(redactSecretsFromText(db)).toContain("[REDACTED_SECRET]");
    expect(redactSecretsFromText(db)).not.toContain("superSecretPass123");
  });

  it("should recursively redact sensitive object fields", () => {
    const obj = {
      username: "alex",
      password: "UltraSecretPassword123!",
      sessionToken: "abc123xyz789",
      nested: {
        apiKey: "AIzaSyD-secret-google-key-12345",
        nominalData: 42,
      },
    };

    const redacted = redactSecretsFromObject(obj) as any;
    expect(redacted.username).toBe("alex");
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.sessionToken).toBe("[REDACTED]");
    expect(redacted.nested.apiKey).toBe("[REDACTED]");
    expect(redacted.nested.nominalData).toBe(42);
  });

  it("should sanitize process command line arguments", () => {
    const cli =
      "node server.js --port=3000 --password=SuperSecretPassword --token=secret-token-123";
    const sanitized = redactProcessCommandLine(cli);
    expect(sanitized).toContain("--credential=[REDACTED]");
    expect(sanitized).not.toContain("SuperSecretPassword");
  });
});
