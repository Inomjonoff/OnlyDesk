import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildServer } from "../server";
import * as jwt from "jsonwebtoken";
import { getEnv } from "@nexusdesk/config";

describe("Phase 7: Chat, Recording & Timeline REST API Integration Tests", () => {
  let server: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    server = buildServer();
    await server.ready();

    const env = getEnv();
    authToken = jwt.sign(
      { sub: "usr_phase7_tester", email: "p7@nexusdesk.ai", role: "USER" },
      env.JWT_SECRET,
      { expiresIn: "1h" },
    );
  });

  afterAll(async () => {
    await server.close();
  });

  it("POST /api/v1/sessions/:id/messages persists and synchronizes chat message", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/api/v1/sessions/ses_p7_1/messages",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        messageId: "msg_p7_test_1",
        sessionId: "ses_p7_1",
        senderUserId: "usr_phase7_tester",
        senderDeviceId: "dev_1",
        senderName: "Tester",
        type: "TEXT",
        text: "Hello from Phase 7 test",
        sequence: 1,
        timestamp: Date.now(),
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.messageId).toBe("msg_p7_test_1");
  });

  it("GET /api/v1/sessions/:id/messages paginates chat history", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/api/v1/sessions/ses_p7_1/messages?limit=10",
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.pagination.total).toBeGreaterThan(0);
  });

  it("POST /api/v1/sessions/:id/recordings and GET playback-url creates and signs recording URL", async () => {
    const createRes = await server.inject({
      method: "POST",
      url: "/api/v1/sessions/ses_p7_1/recordings",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        recordingId: "rec_p7_1",
        sessionId: "ses_p7_1",
        startedByUserId: "usr_phase7_tester",
        startedByDeviceId: "dev_1",
        status: "READY",
        consentState: "GRANTED",
        codec: "H264",
        container: "mp4",
        width: 1920,
        height: 1080,
        fps: 30,
        durationMs: 60000,
        fileSize: 1048576,
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        startedAt: Date.now() - 60000,
        stoppedAt: Date.now(),
      },
    });

    expect(createRes.statusCode).toBe(201);

    const playRes = await server.inject({
      method: "GET",
      url: "/api/v1/recordings/rec_p7_1/playback-url",
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(playRes.statusCode).toBe(200);
    const playBody = playRes.json();
    expect(playBody.data.playbackUrl).toContain("https://storage.nexusdesk.ai/signed/rec_p7_1");
    expect(playBody.data.expiresAt).toBeDefined();
  });

  it("GET /api/v1/sessions/:id/timeline returns correlated timeline events", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/api/v1/sessions/ses_p7_1/timeline",
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
