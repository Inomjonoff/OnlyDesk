import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";

export function buildWorkerServer(): FastifyInstance {
  const server = fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  server.register(cors, { origin: true });

  // Health checks
  server.get("/health", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "worker",
      timestamp: new Date().toISOString(),
    });
  });

  server.get("/ready", async (_request, reply) => {
    return reply.send({
      ready: true,
      service: "worker",
      uptime: process.uptime(),
    });
  });

  return server;
}
