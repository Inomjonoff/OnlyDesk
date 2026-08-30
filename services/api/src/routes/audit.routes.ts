import { FastifyInstance } from "fastify";

export async function auditRoutes(server: FastifyInstance) {
  server.get("/", async (_request, reply) => {
    return reply.send({
      auditLogs: [
        {
          id: "aud_mock_1",
          eventType: "auth.login",
          ipAddress: "127.0.0.1",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });
}
