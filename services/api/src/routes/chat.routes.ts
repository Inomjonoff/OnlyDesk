import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { ChatMessagePayload } from "@nexusdesk/types";

// In-memory chat store for reliable synchronization and pagination
const sessionChatMessages = new Map<string, ChatMessagePayload[]>();

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticate);

  // GET /api/v1/sessions/:id/messages
  app.get(
    "/api/v1/sessions/:id/messages",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const sessionId = request.params.id;
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || "50", 10)));
      const cursor = request.query.cursor;

      const messages = sessionChatMessages.get(sessionId) || [];
      let startIndex = 0;

      if (cursor) {
        const cursorIndex = messages.findIndex((m) => m.messageId === cursor);
        if (cursorIndex !== -1) {
          startIndex = cursorIndex + 1;
        }
      }

      const page = messages.slice(startIndex, startIndex + limit);
      const nextCursor = page.length === limit ? page[page.length - 1]?.messageId : null;

      return reply.send({
        success: true,
        data: page,
        pagination: {
          limit,
          nextCursor,
          total: messages.length,
        },
      });
    },
  );

  // POST /api/v1/sessions/:id/messages (Reliable sync fallback)
  app.post(
    "/api/v1/sessions/:id/messages",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: ChatMessagePayload;
      }>,
      reply: FastifyReply,
    ) => {
      const sessionId = request.params.id;
      const payload = request.body;

      if (!sessionChatMessages.has(sessionId)) {
        sessionChatMessages.set(sessionId, []);
      }

      const list = sessionChatMessages.get(sessionId)!;

      // Idempotency: check if messageId already exists
      const existing = list.find((m) => m.messageId === payload.messageId);
      if (existing) {
        return reply.status(200).send({
          success: true,
          data: existing,
        });
      }

      const message: ChatMessagePayload = {
        ...payload,
        sessionId,
        deliveryState: "DELIVERED",
      };

      list.push(message);

      return reply.status(201).send({
        success: true,
        data: message,
      });
    },
  );
}
