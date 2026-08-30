import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { errorHandler } from "./middleware/error";
import { authRoutes } from "./routes/auth.routes";
import { deviceRoutes } from "./routes/device.routes";
import { sessionRoutes } from "./routes/session.routes";
import { aiRoutes } from "./routes/ai.routes";
import { auditRoutes } from "./routes/audit.routes";
import { transferRoutes } from "./routes/transfer.routes";
import { chatRoutes } from "./routes/chat.routes";
import { recordingRoutes } from "./routes/recording.routes";
import { timelineRoutes } from "./routes/timeline.routes";
import { healthRoutes, MetricsCollector } from "./routes/health.routes";
import { inviteRoutes } from "./routes/invite.routes";
import { feedbackRoutes } from "./routes/feedback.routes";
import { versionRoutes } from "./routes/version.routes";
import { diagnosticsRoutes } from "./routes/diagnostics.routes";

export function buildServer(): FastifyInstance {
  const server = fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            hostname: request.hostname,
            remoteAddress: request.ip,
          };
        },
      },
    },
  });

  server.register(cors, { origin: true });
  server.register(helmet, { contentSecurityPolicy: false });
  server.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  // Telemetry hooks
  server.addHook("onRequest", async () => {
    MetricsCollector.incrementRequest();
  });

  server.addHook("onError", async () => {
    MetricsCollector.incrementError();
  });

  server.setErrorHandler(errorHandler);

  // Health and Metrics Routes
  server.register(healthRoutes);

  // API V1 Routes
  server.register(authRoutes, { prefix: "/api/v1/auth" });
  server.register(deviceRoutes, { prefix: "/api/v1/devices" });
  server.register(sessionRoutes, { prefix: "/api/v1/sessions" });
  server.register(transferRoutes, { prefix: "/api/v1/transfers" });
  server.register(chatRoutes);
  server.register(recordingRoutes);
  server.register(timelineRoutes);
  server.register(aiRoutes, { prefix: "/api/v1/ai" });
  server.register(auditRoutes, { prefix: "/api/v1/audit" });
  server.register(inviteRoutes, { prefix: "/api/v1/invites" });
  server.register(feedbackRoutes, { prefix: "/api/v1/feedback" });
  server.register(versionRoutes, { prefix: "/api/v1/version" });
  server.register(diagnosticsRoutes, { prefix: "/api/v1/support/diagnostics" });

  return server;
}
