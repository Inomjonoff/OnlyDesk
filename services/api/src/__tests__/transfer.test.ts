import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildServer } from "../server";
import * as jwt from "jsonwebtoken";
import { getEnv } from "@nexusdesk/config";

describe("Phase 6: File Transfer REST Metadata API Tests", () => {
  let server: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    server = buildServer();
    await server.ready();

    const env = getEnv();
    authToken = jwt.sign(
      { sub: "usr_transfer_tester", email: "test@nexusdesk.ai", role: "USER" },
      env.JWT_SECRET,
      { expiresIn: "1h" },
    );
  });

  afterAll(async () => {
    await server.close();
  });

  it("POST /api/v1/transfers creates metadata record without file bytes", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/api/v1/transfers",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        type: "file.request",
        transferId: "tr_meta_1",
        sessionId: "ses_meta_1",
        fileName: "project.zip",
        fileSize: 1048576,
        mimeType: "application/zip",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        chunkSize: 65536,
        totalChunks: 16,
        timestamp: Date.now(),
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.id).toBe("tr_meta_1");
    expect(body.data.status).toBe("PENDING");
  });

  it("GET /api/v1/transfers lists active transfers", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/api/v1/transfers",
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("POST /api/v1/transfers/:id/accept updates transfer status", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/api/v1/transfers/tr_meta_1/accept",
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe("TRANSFERRING");
  });
});
