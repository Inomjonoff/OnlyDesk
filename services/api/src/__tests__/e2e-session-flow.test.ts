import { describe, it, expect, beforeAll } from "vitest";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";
import { generateEd25519KeyPair } from "@nexusdesk/crypto";

describe("E2E Session Full-Lifecycle Test (Phase 9 Real-World Validation)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  it("should complete the entire remote support lifecycle successfully", async () => {
    // 1. Authenticate Host User A
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "alice.host@nexusdesk.uz",
        password: "Password123",
        name: "Alice Host",
      },
    });

    const loginResA = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "alice.host@nexusdesk.uz",
        password: "Password123",
      },
    });
    expect(loginResA.statusCode).toBe(200);
    const { tokens: tokensA } = JSON.parse(loginResA.body);

    // 2. Enroll Host Device A
    const keyPairA = generateEd25519KeyPair();
    const devResA = await app.inject({
      method: "POST",
      url: "/api/v1/devices",
      headers: { authorization: `Bearer ${tokensA.accessToken}` },
      payload: {
        displayId: "NXD-1111-2222",
        name: "Alice Desktop Host",
        platform: "WINDOWS",
        osVersion: "11.0",
        appVersion: "0.1.0",
        publicKey: keyPairA.publicKeyPem,
        fingerprint: keyPairA.fingerprint,
      },
    });
    expect(devResA.statusCode).toBe(201);
    const { device: deviceA } = JSON.parse(devResA.body);

    // 3. Authenticate Viewer User B
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "bob.viewer@nexusdesk.uz",
        password: "Password123",
        name: "Bob Viewer",
      },
    });

    const loginResB = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "bob.viewer@nexusdesk.uz",
        password: "Password123",
      },
    });
    expect(loginResB.statusCode).toBe(200);
    const { tokens: tokensB } = JSON.parse(loginResB.body);

    // 4. Enroll Viewer Device B
    const keyPairB = generateEd25519KeyPair();
    const devResB = await app.inject({
      method: "POST",
      url: "/api/v1/devices",
      headers: { authorization: `Bearer ${tokensB.accessToken}` },
      payload: {
        displayId: "NXD-3333-4444",
        name: "Bob Remote Viewer",
        platform: "WINDOWS",
        osVersion: "11.0",
        appVersion: "0.1.0",
        publicKey: keyPairB.publicKeyPem,
        fingerprint: keyPairB.fingerprint,
      },
    });
    expect(devResB.statusCode).toBe(201);
    const { device: deviceB } = JSON.parse(devResB.body);

    // 5. Initiate Remote Session (Bob -> Alice)
    const sessionRes = await app.inject({
      method: "POST",
      url: "/api/v1/sessions",
      headers: { authorization: `Bearer ${tokensB.accessToken}` },
      payload: {
        targetDeviceId: deviceA.id,
        initiatorDeviceId: deviceB.id,
        requestedPermissions: ["SCREEN_VIEW", "MOUSE_CONTROL"],
      },
    });
    expect(sessionRes.statusCode).toBe(201);
    const { data: session } = JSON.parse(sessionRes.body);
    expect(session.status).toBe("WAITING_FOR_APPROVAL");

    // 6. Host Approves Session
    const approveRes = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${session.sessionId}/approve`,
      headers: { authorization: `Bearer ${tokensA.accessToken}` },
      payload: {
        grantedPermissions: ["SCREEN_VIEW", "MOUSE_CONTROL"],
      },
    });
    expect(approveRes.statusCode).toBe(200);

    // 7. Initialize AI Copilot Conversation
    const convRes = await app.inject({
      method: "POST",
      url: "/api/v1/ai/conversations",
      payload: {
        sessionId: session.sessionId,
      },
    });
    expect(convRes.statusCode).toBe(201);
    const { conversation } = JSON.parse(convRes.body);

    // 8. Send Diagnostic Message to AI Copilot
    const aiMsgRes = await app.inject({
      method: "POST",
      url: `/api/v1/ai/conversations/${conversation.conversationId}/messages`,
      payload: {
        content: "Please diagnose CPU and memory usage.",
      },
    });
    expect(aiMsgRes.statusCode).toBe(200);
    const aiData = JSON.parse(aiMsgRes.body);
    expect(aiData.response).toBeDefined();

    // 9. End Remote Session Gracefully
    const endRes = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${session.sessionId}/end`,
      headers: { authorization: `Bearer ${tokensA.accessToken}` },
      payload: { reason: "USER_ENDED" },
    });
    expect(endRes.statusCode).toBe(200);

    // 10. Verify Post-Session AI Report & Status
    const reportRes = await app.inject({
      method: "GET",
      url: `/api/v1/ai/sessions/${session.sessionId}/report`,
    });
    expect(reportRes.statusCode).toBe(200);
    const { report } = JSON.parse(reportRes.body);
    expect(report.sessionId).toBe(session.sessionId);
    expect(report.status).toBe("READY");
  });
});
