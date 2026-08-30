import { describe, it, expect, beforeAll } from "vitest";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("Phase 1: Authentication Integration Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  const testUser = {
    email: `engineer_${Date.now()}@nexusdesk.ai`,
    name: "Nexus Engineer",
    password: "Password123",
  };

  let accessToken: string;
  let refreshToken: string;

  it("registers a new user successfully", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: testUser,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe(testUser.email.toLowerCase());
    expect(body.user.name).toBe(testUser.name);
    expect(body.user.role).toBe("USER");
    expect(body.user.passwordHash).toBeUndefined(); // never expose passwordHash
  });

  it("rejects duplicate email registration", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: testUser,
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("logs in with valid credentials and returns JWT access + refresh tokens", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.tokens.accessToken).toBeDefined();
    expect(body.tokens.refreshToken).toBeDefined();
    expect(body.tokens.tokenType).toBe("Bearer");
    expect(body.user.email).toBe(testUser.email.toLowerCase());

    accessToken = body.tokens.accessToken;
    refreshToken = body.tokens.refreshToken;
  });

  it("rejects login with incorrect password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: testUser.email,
        password: "WrongPassword999",
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("fetches authenticated user profile via /api/v1/auth/me", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe(testUser.email.toLowerCase());
  });

  it("rotates refresh token and returns a new access token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: {
        refreshToken,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.tokens.accessToken).toBeDefined();
    expect(body.tokens.refreshToken).toBeDefined();
    expect(body.tokens.refreshToken).not.toBe(refreshToken); // must rotate!

    // Verify the old refresh token is now revoked
    const replayRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: {
        refreshToken,
      },
    });
    expect(replayRes.statusCode).toBe(401);
  });

  it("sets up and verifies 2FA foundation", async () => {
    // 1. Setup 2FA
    const setupRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/2fa/setup",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(setupRes.statusCode).toBe(200);
    const setupBody = JSON.parse(setupRes.body);
    expect(setupBody.secret).toBeDefined();
    expect(setupBody.otpAuthUrl).toContain("otpauth://totp");

    // 2. Verify 2FA
    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/2fa/verify",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        secret: setupBody.secret,
        code: "123456",
      },
    });

    expect(verifyRes.statusCode).toBe(200);
  });
});
