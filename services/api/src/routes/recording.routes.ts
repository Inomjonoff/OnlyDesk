import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { RecordingMetadata } from "@nexusdesk/types";

// In-memory store for recording metadata
const sessionRecordings = new Map<string, RecordingMetadata>();

export async function recordingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticate);

  // GET /api/v1/sessions/:id/recordings
  app.get(
    "/api/v1/sessions/:id/recordings",
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply,
    ) => {
      const sessionId = request.params.id;
      const list = Array.from(sessionRecordings.values()).filter((r) => r.sessionId === sessionId);

      return reply.send({
        success: true,
        data: list,
      });
    },
  );

  // POST /api/v1/sessions/:id/recordings (Create / update recording metadata)
  app.post(
    "/api/v1/sessions/:id/recordings",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: RecordingMetadata;
      }>,
      reply: FastifyReply,
    ) => {
      const sessionId = request.params.id;
      const metadata = request.body;

      const record: RecordingMetadata = {
        ...metadata,
        sessionId,
      };

      sessionRecordings.set(metadata.recordingId, record);

      return reply.status(201).send({
        success: true,
        data: record,
      });
    },
  );

  // GET /api/v1/recordings/:id
  app.get(
    "/api/v1/recordings/:id",
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply,
    ) => {
      const record = sessionRecordings.get(request.params.id);
      if (!record) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Recording not found" },
        });
      }

      return reply.send({
        success: true,
        data: record,
      });
    },
  );

  // GET /api/v1/recordings/:id/playback-url (Short-lived signed URL generation)
  app.get(
    "/api/v1/recordings/:id/playback-url",
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply,
    ) => {
      const record = sessionRecordings.get(request.params.id);
      if (!record) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Recording not found" },
        });
      }

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const signedPlaybackUrl = `https://storage.nexusdesk.ai/signed/${record.recordingId}?token=mock_sig_${Date.now()}&expires=${expiresAt}`;

      return reply.send({
        success: true,
        data: {
          recordingId: record.recordingId,
          playbackUrl: signedPlaybackUrl,
          expiresAt,
        },
      });
    },
  );

  // DELETE /api/v1/recordings/:id
  app.delete(
    "/api/v1/recordings/:id",
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply,
    ) => {
      const record = sessionRecordings.get(request.params.id);
      if (!record) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Recording not found" },
        });
      }

      record.status = "DELETED";

      return reply.send({
        success: true,
        data: {
          recordingId: record.recordingId,
          status: "DELETED",
        },
      });
    },
  );
}
