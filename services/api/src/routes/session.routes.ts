import { FastifyInstance } from "fastify";
import {
  CreateSessionSchema,
  ApproveSessionSchema,
  RejectSessionSchema,
  CancelSessionSchema,
  EndSessionSchema,
} from "@nexusdesk/validation";
import { sessionRepository } from "../db/session.repository";
import { deviceRepository } from "../db/device.repository";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { SessionStatus } from "@nexusdesk/types";

export async function sessionRoutes(server: FastifyInstance) {
  server.post("/", { preHandler: authenticate }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = CreateSessionSchema.parse(request.body);

    // Verify target device exists and is available
    const targetDevice = await deviceRepository.findById(body.targetDeviceId);
    if (!targetDevice) {
      return reply.status(404).send({
        error: {
          code: "DEVICE_NOT_FOUND",
          message: "Target device was not found",
          requestId: request.id,
        },
      });
    }

    if (targetDevice.status === "OFFLINE") {
      return reply.status(400).send({
        error: {
          code: "DEVICE_OFFLINE",
          message: "Target device is currently offline",
          requestId: request.id,
        },
      });
    }

    const initiatorUserId = req.user?.sub || "usr_anonymous";
    const initiatorDeviceId = body.initiatorDeviceId || "dev_web_client";

    const session = await sessionRepository.createSession({
      initiatorUserId,
      initiatorDeviceId,
      targetDeviceId: body.targetDeviceId,
      targetUserId: targetDevice.userId,
      requestedPermissions: body.requestedPermissions,
    });

    return reply.status(201).send({
      data: {
        sessionId: session.id,
        status: session.status,
        expiresAt: session.expiresAt.toISOString(),
        requestedPermissions: session.requestedPermissions,
        targetDevice: {
          id: targetDevice.id,
          displayId: targetDevice.displayId,
          name: targetDevice.name,
          status: targetDevice.status,
        },
      },
      message: "Remote session created, waiting for target approval",
    });
  });

  server.get("/", { preHandler: authenticate }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const query = request.query as {
      page?: string;
      pageSize?: string;
      status?: SessionStatus;
      deviceId?: string;
    };

    const result = await sessionRepository.listSessions({
      userId: req.user?.sub,
      deviceId: query.deviceId,
      status: query.status,
      page: query.page ? parseInt(query.page, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20,
    });

    return reply.send({
      data: result.items,
      pagination: {
        page: query.page ? parseInt(query.page, 10) : 1,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20,
        total: result.total,
      },
    });
  });

  server.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await sessionRepository.findById(id);

    if (!session) {
      return reply.status(404).send({
        error: {
          code: "SESSION_NOT_FOUND",
          message: "Session was not found",
          requestId: request.id,
        },
      });
    }

    return reply.send({ data: session });
  });

  server.post("/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = ApproveSessionSchema.parse(request.body);

    const existing = await sessionRepository.findById(id);
    if (!existing) {
      return reply.status(404).send({
        error: { code: "SESSION_NOT_FOUND", message: "Session not found", requestId: request.id },
      });
    }

    // IDOR Check: If authentication is present and target user is specified, enforce match
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        await authenticate(request, reply);
        const req = request as AuthenticatedRequest;
        if (req.user && existing.targetUserId && existing.targetUserId !== req.user.sub) {
          return reply.status(403).send({
            error: {
              code: "FORBIDDEN",
              message: "You are not authorized to approve session requests for this target device.",
              requestId: request.id,
            },
          });
        }
      } catch {
        // Fallback for standalone approval
      }
    }

    try {
      const session = await sessionRepository.approveSession(id, body.grantedPermissions);
      return reply.send({
        data: session,
        message: "Session approved successfully",
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "SESSION_NOT_FOUND") {
          return reply.status(404).send({
            error: {
              code: "SESSION_NOT_FOUND",
              message: "Session not found",
              requestId: request.id,
            },
          });
        }
        if (err.message === "SESSION_EXPIRED") {
          return reply.status(400).send({
            error: {
              code: "SESSION_EXPIRED",
              message: "Session has expired",
              requestId: request.id,
            },
          });
        }
        return reply.status(400).send({
          error: { code: "SESSION_INVALID_STATE", message: err.message, requestId: request.id },
        });
      }
      throw err;
    }
  });

  server.post("/:id/ready", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const session = await sessionRepository.readyForWebRtc(id);
      return reply.send({
        data: session,
        message: "Session is ready for WebRTC",
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        return reply.status(400).send({
          error: { code: "SESSION_INVALID_STATE", message: err.message, requestId: request.id },
        });
      }
      throw err;
    }
  });

  server.post("/:id/reject", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = RejectSessionSchema.parse(request.body || {});

    try {
      const session = await sessionRepository.rejectSession(id, body.reason);
      return reply.send({
        data: session,
        message: "Session rejected",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "SESSION_NOT_FOUND") {
        return reply.status(404).send({
          error: {
            code: "SESSION_NOT_FOUND",
            message: "Session not found",
            requestId: request.id,
          },
        });
      }
      throw err;
    }
  });

  server.post("/:id/cancel", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CancelSessionSchema.parse(request.body || {});

    try {
      const session = await sessionRepository.cancelSession(id, body.reason);
      return reply.send({
        data: session,
        message: "Session cancelled",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "SESSION_NOT_FOUND") {
        return reply.status(404).send({
          error: {
            code: "SESSION_NOT_FOUND",
            message: "Session not found",
            requestId: request.id,
          },
        });
      }
      throw err;
    }
  });

  server.post("/:id/end", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = EndSessionSchema.parse(request.body || {});

    try {
      const session = await sessionRepository.endSession(id, body.reason);
      return reply.send({
        data: session,
        message: "Session ended",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "SESSION_NOT_FOUND") {
        return reply.status(404).send({
          error: {
            code: "SESSION_NOT_FOUND",
            message: "Session not found",
            requestId: request.id,
          },
        });
      }
      throw err;
    }
  });

  server.get("/:id/rtc/config", async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await sessionRepository.findById(id);

    if (!session) {
      return reply.status(404).send({
        error: {
          code: "SESSION_NOT_FOUND",
          message: "Session not found",
          requestId: request.id,
        },
      });
    }

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return reply.send({
      data: {
        sessionId: session.id,
        iceServers: [
          {
            urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
          },
          {
            urls: [
              "turn:relay.nexusdesk.ai:3478?transport=udp",
              "turn:relay.nexusdesk.ai:3478?transport=tcp",
            ],
            username: `user_${session.id}`,
            credential: `cred_${session.id}`,
          },
        ],
        iceTransportPolicy: "all",
        expiresAt,
      },
    });
  });
}
