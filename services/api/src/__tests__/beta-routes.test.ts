import { describe, it, expect, beforeAll } from "vitest";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("Phase 10 Beta Routes Integration Tests", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "beta.tester@nexusdesk.uz",
        password: "Password123",
        name: "Beta Tester",
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "beta.tester@nexusdesk.uz", password: "Password123" },
    });
    authToken = JSON.parse(loginRes.body).tokens.accessToken;
  });

  it("creates and resolves a single-use 15-minute connection invite token", async () => {
    // 1. Create Invite
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/invites",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        targetDeviceId: "dev_target_123",
        requestedPermissions: ["SCREEN_VIEW", "MOUSE_CONTROL"],
      },
    });
    expect(createRes.statusCode).toBe(201);
    const { inviteToken, inviteUrl } = JSON.parse(createRes.body);
    expect(inviteToken).toMatch(/^inv_/);
    expect(inviteUrl).toContain("/connect/");

    // 2. Consume Invite
    const resolveRes = await app.inject({
      method: "GET",
      url: `/api/v1/invites/${inviteToken}`,
    });
    expect(resolveRes.statusCode).toBe(200);
    const resolved = JSON.parse(resolveRes.body);
    expect(resolved.targetDeviceId).toBe("dev_target_123");

    // 3. Second consumption must fail (single-use)
    const replayRes = await app.inject({
      method: "GET",
      url: `/api/v1/invites/${inviteToken}`,
    });
    expect(replayRes.statusCode).toBe(410);
  });

  it("submits and lists user feedback and bug reports", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/feedback",
      payload: {
        category: "FEATURE_REQUEST",
        rating: 5,
        comment: "NexusDesk AI is super fast! Would love multi-monitor support next.",
        clientVersion: "1.0.0-beta.1",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.feedbackId).toMatch(/^fb_/);

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/feedback/list",
    });
    expect(listRes.statusCode).toBe(200);
    expect(JSON.parse(listRes.body).count).toBeGreaterThanOrEqual(1);
  });

  it("validates protocol and client version compatibility", async () => {
    // Current compatible version
    const compRes = await app.inject({
      method: "POST",
      url: "/api/v1/version/check",
      payload: {
        clientVersion: "1.0.0-beta.1",
        protocolVersion: 1,
        platform: "WINDOWS",
      },
    });
    expect(compRes.statusCode).toBe(200);
    const compBody = JSON.parse(compRes.body);
    expect(compBody.compatible).toBe(true);
    expect(compBody.updateRequired).toBe(false);

    // Incompatible ancient version
    const oldRes = await app.inject({
      method: "POST",
      url: "/api/v1/version/check",
      payload: {
        clientVersion: "0.1.0",
        protocolVersion: 0,
        platform: "WINDOWS",
      },
    });
    expect(oldRes.statusCode).toBe(200);
    const oldBody = JSON.parse(oldRes.body);
    expect(oldBody.compatible).toBe(false);
    expect(oldBody.updateRequired).toBe(true);
  });

  it("uploads and retrieves privacy-safe diagnostic support bundles", async () => {
    const upRes = await app.inject({
      method: "POST",
      url: "/api/v1/support/diagnostics",
      payload: {
        osInfo: "Windows 11 x64",
        appVersion: "1.0.0-beta.1",
        networkState: "ICE_CONNECTED",
        recentErrorCodes: ["ERR_RELAY_TIMEOUT"],
      },
    });
    expect(upRes.statusCode).toBe(201);
    const { bundleId } = JSON.parse(upRes.body);
    expect(bundleId).toMatch(/^diag_/);

    const getRes = await app.inject({
      method: "GET",
      url: `/api/v1/support/diagnostics/${bundleId}`,
    });
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body).bundle.osInfo).toBe("Windows 11 x64");
  });
});
