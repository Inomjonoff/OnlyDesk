import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";
import * as jwt from "jsonwebtoken";
import { getEnv } from "@nexusdesk/config";
import { SignalingClientMessageSchema } from "@nexusdesk/validation";
import { SignalingEventEnvelope, SessionPermission } from "@nexusdesk/types";
import { generateSecureToken } from "@nexusdesk/crypto";
import { SignalingSessionManager } from "./session-manager";
import { SignalingMetricsCollector } from "./metrics";

const MAX_MESSAGE_SIZE = 64 * 1024; // 64 KB limit

export function buildSignalingServer(sessionManager = new SignalingSessionManager()) {
  const env = getEnv();
  const server = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  server.register(fastifyWebsocket, {
    options: {
      maxPayload: MAX_MESSAGE_SIZE,
    },
  });

  server.get("/health", async () => ({
    status: "ok",
    service: "signaling",
    connections: sessionManager.getActiveConnectionCount(),
    sessions: sessionManager.getActiveSessionCount(),
    timestamp: new Date().toISOString(),
  }));

  server.get("/metrics", async (_req, reply) => {
    const formatted = SignalingMetricsCollector.toPrometheusFormat();
    return reply.header("Content-Type", "text/plain; version=0.0.4").send(formatted);
  });

  server.register(async function (fastify) {
    fastify.get("/ws", { websocket: true }, (socket: WebSocket, req) => {
      let connectionId: string | null = null;
      let authenticatedUser: { sub: string; email?: string } | null = null;
      let authenticatedDeviceId: string | null = null;

      // Check query parameter token if provided
      const query = req.query as { token?: string; deviceId?: string };
      if (query.token) {
        try {
          const decoded = jwt.verify(query.token, env.JWT_SECRET) as {
            sub: string;
            email?: string;
          };
          authenticatedUser = decoded;
          authenticatedDeviceId = query.deviceId || null;
          const conn = sessionManager.registerConnection(
            socket,
            decoded.sub,
            authenticatedDeviceId || undefined,
          );
          connectionId = conn.connectionId;

          sendEnvelope(socket, {
            version: 1,
            eventId: generateEventId(),
            type: "connection.authenticated",
            timestamp: Date.now(),
            payload: {
              connectionId,
              userId: decoded.sub,
              deviceId: authenticatedDeviceId,
            },
          });
        } catch {
          // Will wait for connection.authenticate message
        }
      }

      socket.on("message", (raw: Buffer | string) => {
        try {
          const rawStr = raw.toString();
          if (rawStr.length > MAX_MESSAGE_SIZE) {
            sendError(socket, "MESSAGE_TOO_LARGE", "Message exceeds 64KB limit");
            return;
          }

          let json: unknown;
          try {
            json = JSON.parse(rawStr);
          } catch {
            sendError(socket, "INVALID_JSON", "Payload is not valid JSON");
            return;
          }

          const parsed = SignalingClientMessageSchema.safeParse(json);
          if (!parsed.success) {
            sendError(
              socket,
              "INVALID_MESSAGE",
              parsed.error.issues[0]?.message || "Validation failed",
            );
            return;
          }

          const msg: SignalingClientMessage = parsed.data;

          // 1. Authenticate message
          if (msg.type === "connection.authenticate") {
            try {
              const decoded = jwt.verify(msg.token, env.JWT_SECRET) as {
                sub: string;
                email?: string;
              };
              authenticatedUser = decoded;
              authenticatedDeviceId = msg.deviceId || null;

              if (connectionId) {
                sessionManager.removeConnection(connectionId);
              }

              const conn = sessionManager.registerConnection(
                socket,
                decoded.sub,
                authenticatedDeviceId || undefined,
              );
              connectionId = conn.connectionId;

              sendEnvelope(socket, {
                version: 1,
                eventId: generateEventId(),
                type: "connection.authenticated",
                timestamp: Date.now(),
                payload: {
                  connectionId,
                  userId: decoded.sub,
                  deviceId: authenticatedDeviceId,
                },
              });
              return;
            } catch {
              sendError(socket, "SIGNALING_AUTH_FAILED", "Invalid authentication token");
              return;
            }
          }

          // Require authentication for all other messages
          if (!authenticatedUser || !connectionId) {
            sendError(socket, "SIGNALING_AUTH_REQUIRED", "Connection must be authenticated first");
            return;
          }

          // 2. Application heartbeat
          if (msg.type === "heartbeat") {
            sessionManager.updateHeartbeat(connectionId);
            sendEnvelope(socket, {
              version: 1,
              eventId: generateEventId(),
              type: "heartbeat.ack",
              timestamp: Date.now(),
              payload: { receivedAt: msg.timestamp, acknowledgedAt: Date.now() },
            });
            return;
          }

          // 3. Session Subscription
          if (msg.type === "session.subscribe") {
            const success = sessionManager.subscribeSession(connectionId, msg.sessionId);
            if (!success) {
              sendError(socket, "SESSION_FORBIDDEN", "Unauthorized to subscribe to this session");
              return;
            }
            sendEnvelope(socket, {
              version: 1,
              eventId: generateEventId(),
              type: "session.subscribed",
              sessionId: msg.sessionId,
              timestamp: Date.now(),
              payload: { sessionId: msg.sessionId },
            });
            return;
          }

          // 4. Session Request
          if (msg.type === "session.request") {
            const session = sessionManager.createSession({
              initiatorUserId: authenticatedUser.sub,
              initiatorDeviceId: authenticatedDeviceId || "dev_web_client",
              targetDeviceId: msg.targetDeviceId,
              requestedPermissions: msg.requestedPermissions as SessionPermission[],
            });

            // Automatically subscribe initiator to session events
            sessionManager.subscribeSession(connectionId, session.id);

            // Notify initiator that session was created & requested
            sendEnvelope(socket, {
              version: 1,
              eventId: generateEventId(),
              type: "session.requested",
              sessionId: session.id,
              timestamp: Date.now(),
              payload: {
                sessionId: session.id,
                targetDeviceId: msg.targetDeviceId,
                status: session.status,
                expiresAt: session.expiresAt.toISOString(),
                requestedPermissions: session.requestedPermissions,
              },
            });

            // Route request envelope to target device
            sessionManager.routeToDevice(msg.targetDeviceId, {
              version: 1,
              eventId: generateEventId(),
              type: "session.request",
              sessionId: session.id,
              timestamp: Date.now(),
              sender: {
                userId: authenticatedUser.sub,
                deviceId: authenticatedDeviceId || undefined,
              },
              payload: {
                sessionId: session.id,
                initiatorUserId: authenticatedUser.sub,
                initiatorDeviceId: authenticatedDeviceId || "dev_web_client",
                requestedPermissions: msg.requestedPermissions,
                expiresAt: session.expiresAt.toISOString(),
              },
            });
            return;
          }

          // 5. Session Accept
          if (msg.type === "session.accept") {
            try {
              const session = sessionManager.approveSession(
                msg.sessionId,
                msg.grantedPermissions as SessionPermission[],
                authenticatedDeviceId || undefined,
              );

              // Auto subscribe target socket to session channel
              sessionManager.subscribeSession(connectionId, session.id);

              const acceptEnvelope: SignalingEventEnvelope = {
                version: 1,
                eventId: generateEventId(),
                type: "session.accepted",
                sessionId: session.id,
                timestamp: Date.now(),
                payload: {
                  sessionId: session.id,
                  grantedPermissions: session.grantedPermissions,
                  status: session.status,
                },
              };

              // Broadcast to session channel + direct route to initiator device/user
              sessionManager.routeToSession(session.id, acceptEnvelope);
              sessionManager.routeToDevice(session.initiatorDeviceId, acceptEnvelope);
              sessionManager.routeToUser(session.initiatorUserId, acceptEnvelope);
              sendEnvelope(socket, acceptEnvelope);
              return;
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Approval failed";
              sendError(socket, "SESSION_INVALID_STATE", msg);
              return;
            }
          }

          // 6. Session Reject
          if (msg.type === "session.reject") {
            try {
              const session = sessionManager.rejectSession(msg.sessionId, msg.reason);
              const rejectEnvelope: SignalingEventEnvelope = {
                version: 1,
                eventId: generateEventId(),
                type: "session.rejected",
                sessionId: session.id,
                timestamp: Date.now(),
                payload: {
                  sessionId: session.id,
                  reason: session.endReason,
                  status: session.status,
                },
              };
              sessionManager.routeToSession(session.id, rejectEnvelope);
              sessionManager.routeToDevice(session.initiatorDeviceId, rejectEnvelope);
              sessionManager.routeToUser(session.initiatorUserId, rejectEnvelope);
              sendEnvelope(socket, rejectEnvelope);
              return;
            } catch (err: unknown) {
              sendError(socket, "SESSION_NOT_FOUND", (err as Error).message);
              return;
            }
          }

          // 7. Session Cancel
          if (msg.type === "session.cancel") {
            try {
              const session = sessionManager.cancelSession(msg.sessionId);
              const cancelEnvelope: SignalingEventEnvelope = {
                version: 1,
                eventId: generateEventId(),
                type: "session.cancelled",
                sessionId: session.id,
                timestamp: Date.now(),
                payload: {
                  sessionId: session.id,
                  status: session.status,
                },
              };
              sessionManager.routeToSession(session.id, cancelEnvelope);
              sessionManager.routeToDevice(session.targetDeviceId, cancelEnvelope);
              sendEnvelope(socket, cancelEnvelope);
              return;
            } catch (err: unknown) {
              sendError(socket, "SESSION_NOT_FOUND", (err as Error).message);
              return;
            }
          }

          // 8. Session End
          if (msg.type === "session.end") {
            try {
              const session = sessionManager.endSession(msg.sessionId, msg.reason);
              const endEnvelope: SignalingEventEnvelope = {
                version: 1,
                eventId: generateEventId(),
                type: "session.ended",
                sessionId: session.id,
                timestamp: Date.now(),
                payload: {
                  sessionId: session.id,
                  reason: session.endReason,
                  status: session.status,
                },
              };
              sessionManager.routeToSession(session.id, endEnvelope);
              sessionManager.routeToDevice(session.initiatorDeviceId, endEnvelope);
              sessionManager.routeToDevice(session.targetDeviceId, endEnvelope);
              sendEnvelope(socket, endEnvelope);
              return;
            } catch (err: unknown) {
              sendError(socket, "SESSION_NOT_FOUND", (err as Error).message);
              return;
            }
          }

          // 9. RTC Signaling Messages (Offer, Answer, ICE Candidate)
          if (
            msg.type === "rtc.offer" ||
            msg.type === "rtc.answer" ||
            msg.type === "rtc.ice_candidate"
          ) {
            const session = sessionManager.getSession(msg.sessionId);
            if (!session) {
              sendError(socket, "SESSION_NOT_FOUND", "Session not found");
              return;
            }

            if (!["APPROVED", "NEGOTIATING", "READY_FOR_WEBRTC"].includes(session.status)) {
              sendError(
                socket,
                "SESSION_INVALID_STATE",
                `Cannot send RTC signaling in state: ${session.status}`,
              );
              return;
            }

            // Route to other peer in session
            sessionManager.routeToSession(
              msg.sessionId,
              {
                version: 1,
                eventId: generateEventId(),
                type: msg.type,
                sessionId: msg.sessionId,
                timestamp: Date.now(),
                sender: {
                  userId: authenticatedUser.sub,
                  deviceId: authenticatedDeviceId || undefined,
                },
                payload: msg,
              },
              connectionId, // exclude self
            );
            return;
          }
        } catch (err: unknown) {
          server.log.error({ err }, "Signaling message processing error");
          sendError(socket, "SERVER_ERROR", "Internal signaling error");
        }
      });

      socket.on("close", () => {
        if (connectionId) {
          sessionManager.removeConnection(connectionId);
        }
      });
    });
  });

  return server;
}

function generateEventId(): string {
  return `evt_${generateSecureToken(12)}`;
}

function sendEnvelope(socket: WebSocket, envelope: SignalingEventEnvelope): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(envelope));
  }
}

function sendError(socket: WebSocket, code: string, message: string): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        version: 1,
        eventId: generateEventId(),
        type: "connection.error",
        timestamp: Date.now(),
        payload: { code, message },
      }),
    );
  }
}
