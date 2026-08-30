import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { SessionTimelineEvent } from "@nexusdesk/types";

// In-memory store for session timeline events
const sessionTimelineEvents = new Map<string, SessionTimelineEvent[]>();

export async function timelineRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticate);

  // GET /api/v1/sessions/:id/timeline
  app.get(
    "/api/v1/sessions/:id/timeline",
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply,
    ) => {
      const sessionId = request.params.id;
      let events = sessionTimelineEvents.get(sessionId);

      if (!events || events.length === 0) {
        // Generate baseline session events if none stored yet
        const now = Date.now();
        events = [
          {
            eventId: `ev_${now - 120000}_create`,
            sessionId,
            type: "SESSION_CREATED",
            title: "Remote Session Created",
            timestamp: now - 120000,
          },
          {
            eventId: `ev_${now - 110000}_approve`,
            sessionId,
            type: "SESSION_APPROVED",
            title: "Connection Approved by Host",
            timestamp: now - 110000,
          },
          {
            eventId: `ev_${now - 100000}_screen`,
            sessionId,
            type: "SCREEN_STARTED",
            title: "Screen Sharing Active",
            timestamp: now - 100000,
          },
          {
            eventId: `ev_${now - 80000}_input`,
            sessionId,
            type: "INPUT_ENABLED",
            title: "Remote Input Control Enabled",
            timestamp: now - 80000,
          },
        ];
        sessionTimelineEvents.set(sessionId, events);
      }

      return reply.send({
        success: true,
        data: events.sort((a, b) => a.timestamp - b.timestamp),
      });
    },
  );

  // POST /api/v1/sessions/:id/timeline
  app.post(
    "/api/v1/sessions/:id/timeline",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: SessionTimelineEvent;
      }>,
      reply: FastifyReply,
    ) => {
      const sessionId = request.params.id;
      const event = request.body;

      if (!sessionTimelineEvents.has(sessionId)) {
        sessionTimelineEvents.set(sessionId, []);
      }

      const list = sessionTimelineEvents.get(sessionId)!;
      list.push({ ...event, sessionId });

      return reply.status(201).send({
        success: true,
        data: event,
      });
    },
  );
}
