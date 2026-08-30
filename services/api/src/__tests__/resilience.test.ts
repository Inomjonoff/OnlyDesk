import { describe, it, expect, beforeAll } from "vitest";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("Production Resilience & Security Boundary Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  it("should reject tampered or invalid JWT access tokens with 401 Unauthorized", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: "Bearer invalid.tampered.token" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("should reject malformed session payloads with 400 Bad Request", async () => {
    // 1. Register & Login user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "resilience.user@nexusdesk.uz",
        password: "Password123",
        name: "Resilience Test User",
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "resilience.user@nexusdesk.uz",
        password: "Password123",
      },
    });
    const { tokens } = JSON.parse(loginRes.body);

    // 2. Submit malformed payload
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/sessions",
      headers: { authorization: `Bearer ${tokens.accessToken}` },
      payload: {
        // Missing required targetDeviceId and permissions
        invalidKey: 123,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("should enforce health check availability during high request volume", async () => {
    for (let i = 0; i < 20; i++) {
      const res = await app.inject({
        method: "GET",
        url: "/health",
      });
      expect(res.statusCode).toBe(200);
    }
  });
});
