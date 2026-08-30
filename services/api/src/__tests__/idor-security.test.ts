import { describe, it, expect, beforeAll } from "vitest";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";
import { generateEd25519KeyPair } from "@nexusdesk/crypto";

describe("IDOR & Authorization Boundary Tests (Phase 10 Security Gate)", () => {
  let app: FastifyInstance;
  let userTokenA: string;
  let userTokenB: string;
  let deviceA: { id: string };

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    // 1. Create User A & Device A
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "alice.idor@nexusdesk.uz",
        password: "Password123",
        name: "Alice IDOR",
      },
    });
    const loginA = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "alice.idor@nexusdesk.uz", password: "Password123" },
    });
    userTokenA = JSON.parse(loginA.body).tokens.accessToken;

    const keyPairA = generateEd25519KeyPair();
    const devResA = await app.inject({
      method: "POST",
      url: "/api/v1/devices",
      headers: { authorization: `Bearer ${userTokenA}` },
      payload: {
        displayId: "NXD-5555-6666",
        name: "Alice Private Host",
        platform: "WINDOWS",
        osVersion: "11.0",
        appVersion: "0.1.0",
        publicKey: keyPairA.publicKeyPem,
        fingerprint: keyPairA.fingerprint,
      },
    });
    deviceA = JSON.parse(devResA.body).device;

    // 2. Create User B (Attacker / Unrelated User)
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "bob.attacker@nexusdesk.uz",
        password: "Password123",
        name: "Bob Attacker",
      },
    });
    const loginB = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "bob.attacker@nexusdesk.uz", password: "Password123" },
    });
    userTokenB = JSON.parse(loginB.body).tokens.accessToken;
  });

  it("should prevent User B from accessing or approving Alice's private session requests without permission", async () => {
    // Alice creates a session with self
    const sesRes = await app.inject({
      method: "POST",
      url: "/api/v1/sessions",
      headers: { authorization: `Bearer ${userTokenA}` },
      payload: {
        targetDeviceId: deviceA.id,
        requestedPermissions: ["SCREEN_VIEW"],
      },
    });
    const { data: session } = JSON.parse(sesRes.body);

    // Attacker Bob tries to approve Alice's session
    const approveRes = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${session.sessionId}/approve`,
      headers: { authorization: `Bearer ${userTokenB}` },
      payload: { grantedPermissions: ["SCREEN_VIEW", "MOUSE_CONTROL"] },
    });

    // Should be rejected (403 Forbidden or 400 Invalid session participant)
    expect([400, 403, 404]).toContain(approveRes.statusCode);
  });

  it("should prevent unauthenticated requests from creating session invite tokens", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/invites",
      payload: { targetDeviceId: deviceA.id },
    });
    expect(res.statusCode).toBe(401);
  });
});
