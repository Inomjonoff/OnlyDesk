import { FastifyInstance } from "fastify";
import { RegisterDeviceSchema, DeviceHeartbeatSchema } from "@nexusdesk/validation";
import { deviceRepository } from "../db/device.repository";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

export async function deviceRoutes(server: FastifyInstance) {
  server.get("/", async (request, reply) => {
    // If authenticated, filter by user; otherwise list available devices
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        await authenticate(request, reply);
        const req = request as AuthenticatedRequest;
        if (req.user) {
          const userDevices = await deviceRepository.listByUserId(req.user.sub);
          return reply.send({ devices: userDevices });
        }
      } catch {
        // Fallback to public list
      }
    }

    const devices = await deviceRepository.listAll();
    return reply.send({ devices });
  });

  server.post("/", async (request, reply) => {
    const body = RegisterDeviceSchema.parse(request.body);

    let userId: string | undefined = undefined;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        await authenticate(request, reply);
        userId = (request as AuthenticatedRequest).user?.sub;
      } catch {
        // Standalone desktop device without user account
      }
    }

    try {
      const device = await deviceRepository.registerDevice({
        displayId: body.displayId,
        name: body.name,
        fingerprint: body.fingerprint,
        publicKey: body.publicKey,
        platform: body.platform,
        osVersion: body.osVersion,
        appVersion: body.appVersion,
        userId,
      });

      return reply.status(201).send({
        device,
        message: "Device registered and enrolled successfully",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "FINGERPRINT_MISMATCH") {
        return reply.status(400).send({
          error: {
            code: "INVALID_FINGERPRINT",
            message: "Public key cryptographic fingerprint mismatch",
            requestId: request.id,
          },
        });
      }
      throw err;
    }
  });

  server.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const device = await deviceRepository.findById(id);

    if (!device) {
      return reply.status(404).send({
        error: {
          code: "DEVICE_NOT_FOUND",
          message: "Device with specified ID was not found",
          requestId: request.id,
        },
      });
    }

    return reply.send({ device });
  });

  server.post("/heartbeat", async (request, reply) => {
    const body = DeviceHeartbeatSchema.parse(request.body);

    const device = await deviceRepository.recordHeartbeat(
      body.deviceId,
      body.status,
      body.systemMetrics,
    );

    if (!device) {
      return reply.status(404).send({
        error: {
          code: "DEVICE_NOT_FOUND",
          message: "Device not found for heartbeat",
          requestId: request.id,
        },
      });
    }

    return reply.send({
      deviceId: device.id,
      displayId: device.displayId,
      status: device.status,
      lastSeenAt: device.lastSeenAt,
      acknowledgedAt: Date.now(),
    });
  });

  server.post("/:id/heartbeat", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = DeviceHeartbeatSchema.partial().parse(request.body || {});

    const device = await deviceRepository.recordHeartbeat(
      id,
      body.status || "ONLINE",
      body.systemMetrics,
    );

    if (!device) {
      return reply.status(404).send({
        error: {
          code: "DEVICE_NOT_FOUND",
          message: "Device not found for heartbeat",
          requestId: request.id,
        },
      });
    }

    return reply.send({
      deviceId: device.id,
      displayId: device.displayId,
      status: device.status,
      lastSeenAt: device.lastSeenAt,
      acknowledgedAt: Date.now(),
    });
  });

  server.delete("/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await deviceRepository.deleteDevice(id);

    if (!success) {
      return reply.status(404).send({
        error: {
          code: "DEVICE_NOT_FOUND",
          message: "Device was not found",
          requestId: request.id,
        },
      });
    }

    return reply.send({
      success: true,
      message: "Device revoked successfully",
    });
  });
}
