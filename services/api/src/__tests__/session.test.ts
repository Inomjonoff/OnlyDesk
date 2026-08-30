import { describe, it, expect, beforeAll } from "vitest";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";
import { deviceRepository } from "../db/device.repository";
import { generateEd25519KeyPair, generateDeviceId } from "@nexusdesk/crypto";
import * as jwt from "jsonwebtoken";
import { getEnv } from "@nexusdesk/config";

describe("Phase 2: API Session Management Integration Tests", () => {
  let app: FastifyInstance;
  let testUserId = "usr_sess_tester";
  let authToken: string;
  let targetDeviceId: string;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    const env = getEnv();
    authToken = jwt.sign(
      { sub: testUserId, email: "tester@nexusdesk.ai", role: "USER" },
      env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    // Create target online device
    const keys = generateEd25519KeyPair();
    const displayId = generateDeviceId();
    const dev = await deviceRepository.registerDevice({
      displayId,
      name: "Remote Target Workstation",
      fingerprint: keys.fingerprint,
      publicKey: keys.publicKeyPem,
      platform: "WINDOWS",
      osVersion: "Windows 11",
      appVersion: "1.0.0",
      userId: testUserId,
    });
    targetDeviceId = dev.id;
  });

  let createdSessionId: string;

  it("creates a new remote session in WAITING_FOR_APPROVAL status", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/sessions",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        targetDeviceId,
        requestedPermissions: ["SCREEN_VIEW", "MOUSE_CONTROL", "KEYBOARD_CONTROL"],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.sessionId).toBeDefined();
    expect(body.data.status).toBe("WAITING_FOR_APPROVAL");
    expect(body.data.targetDevice.id).toBe(targetDeviceId);

    createdSessionId = body.data.sessionId;
  });

  it("retrieves session details by ID", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${createdSessionId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBe(createdSessionId);
    expect(body.data.status).toBe("WAITING_FOR_APPROVAL");
  });

  it("lists sessions with pagination and filters", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/sessions?page=1&pageSize=10",
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it("approves session and transitions to NEGOTIATING", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${createdSessionId}/approve`,
      payload: {
        grantedPermissions: ["SCREEN_VIEW", "MOUSE_CONTROL"],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe("NEGOTIATING");
    expect(body.data.grantedPermissions).toEqual(["SCREEN_VIEW", "MOUSE_CONTROL"]);
  });

  it("transitions session to READY_FOR_WEBRTC", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${createdSessionId}/ready`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe("READY_FOR_WEBRTC");
  });

  it("retrieves WebRTC ICE server configuration for active session", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${createdSessionId}/rtc/config`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.sessionId).toBe(createdSessionId);
    expect(body.data.iceServers.length).toBeGreaterThanOrEqual(1);
    expect(body.data.iceTransportPolicy).toBe("all");
    expect(body.data.expiresAt).toBeDefined();
  });

  it("ends active session cleanly", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${createdSessionId}/end`,
      payload: { reason: "USER_ENDED" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe("ENDED");
    expect(body.data.endReason).toBe("USER_ENDED");
  });

  it("rejects illegal state transition on ended session", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${createdSessionId}/approve`,
      payload: { grantedPermissions: ["SCREEN_VIEW"] },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe("SESSION_INVALID_STATE");
  });
});
