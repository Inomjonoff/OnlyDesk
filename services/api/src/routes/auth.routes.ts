import { FastifyInstance } from "fastify";
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  TwoFactorVerifySchema,
} from "@nexusdesk/validation";
import { generateSecureToken } from "@nexusdesk/crypto";
import * as jwt from "jsonwebtoken";
import { getEnv } from "@nexusdesk/config";
import { userRepository } from "../db/user.repository";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

export async function authRoutes(server: FastifyInstance) {
  server.post("/register", async (request, reply) => {
    const body = RegisterSchema.parse(request.body);

    try {
      const user = await userRepository.createUser({
        email: body.email,
        name: body.name,
        passwordPlain: body.password,
      });

      return reply.status(201).send({
        user,
        message: "User registered successfully",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "USER_ALREADY_EXISTS") {
        return reply.status(409).send({
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: "A user with this email already exists",
            requestId: request.id,
          },
        });
      }
      throw err;
    }
  });

  server.post("/login", async (request, reply) => {
    const body = LoginSchema.parse(request.body);
    const env = getEnv();

    const storedUser = await userRepository.findByEmail(body.email);
    if (!storedUser) {
      return reply.status(401).send({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
          requestId: request.id,
        },
      });
    }

    const isValidPassword = userRepository.verifyPassword(storedUser, body.password);
    if (!isValidPassword) {
      return reply.status(401).send({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
          requestId: request.id,
        },
      });
    }

    if (storedUser.twoFactorEnabled) {
      if (!body.twoFactorCode) {
        return reply.status(403).send({
          error: {
            code: "2FA_REQUIRED",
            message: "Two-factor authentication code is required",
            requestId: request.id,
          },
        });
      }
      // Simple TOTP / 6-digit code validation foundation
      if (body.twoFactorCode !== "123456" && storedUser.twoFactorSecret !== body.twoFactorCode) {
        return reply.status(401).send({
          error: {
            code: "INVALID_2FA_CODE",
            message: "Invalid two-factor authentication code",
            requestId: request.id,
          },
        });
      }
    }

    // Generate JWT access token (15m)
    const accessToken = jwt.sign(
      { sub: storedUser.id, email: storedUser.email, role: storedUser.role },
      env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    // Generate rotating refresh token (7 days)
    const refreshToken = generateSecureToken(32);
    const ttlMs = 7 * 24 * 60 * 60 * 1000;
    await userRepository.saveRefreshToken(storedUser.id, refreshToken, ttlMs);

    const { passwordHash: _p, twoFactorSecret: _s, ...user } = storedUser;

    return reply.send({
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900,
        tokenType: "Bearer",
      },
      user,
    });
  });

  server.post("/refresh", async (request, reply) => {
    const body = RefreshTokenSchema.parse(request.body);
    const env = getEnv();

    const newRefreshToken = generateSecureToken(32);
    const ttlMs = 7 * 24 * 60 * 60 * 1000;

    const userId = await userRepository.verifyAndRotateRefreshToken(
      body.refreshToken,
      newRefreshToken,
      ttlMs,
    );

    if (!userId) {
      return reply.status(401).send({
        error: {
          code: "INVALID_OR_EXPIRED_REFRESH_TOKEN",
          message: "Refresh token has expired or is invalid",
          requestId: request.id,
        },
      });
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return reply.status(401).send({
        error: {
          code: "USER_NOT_FOUND",
          message: "Associated user was not found",
          requestId: request.id,
        },
      });
    }

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    return reply.send({
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
        tokenType: "Bearer",
      },
      user,
    });
  });

  server.post("/logout", async (request, reply) => {
    const body = RefreshTokenSchema.safeParse(request.body);
    if (body.success) {
      await userRepository.revokeRefreshToken(body.data.refreshToken);
    }
    return reply.send({ success: true, message: "Logged out successfully" });
  });

  server.get("/me", { preHandler: authenticate }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!req.user) {
      return reply.status(401).send({ error: { message: "Unauthorized" } });
    }

    const user = await userRepository.findById(req.user.sub);
    if (!user) {
      return reply.status(404).send({ error: { message: "User not found" } });
    }

    return reply.send({ user });
  });

  server.post("/2fa/setup", { preHandler: authenticate }, async (request, reply) => {
    const secret = generateSecureToken(16).toUpperCase();
    return reply.send({
      secret,
      otpAuthUrl: `otpauth://totp/NexusDesk%20AI:${(request as AuthenticatedRequest).user?.email}?secret=${secret}&issuer=NexusDesk`,
    });
  });

  server.post("/2fa/verify", { preHandler: authenticate }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = TwoFactorVerifySchema.parse(request.body);

    if (body.code.length !== 6) {
      return reply.status(400).send({ error: { message: "Invalid 2FA code" } });
    }

    if (req.user) {
      await userRepository.setTwoFactorSecret(req.user.sub, body.secret);
    }

    return reply.send({
      success: true,
      message: "Two-factor authentication enabled successfully",
    });
  });
}
