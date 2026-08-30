import { FastifyInstance } from "fastify";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { FileTransferRequestSchema } from "@nexusdesk/validation";

interface TransferRecord {
  id: string;
  sessionId: string;
  senderDeviceId: string;
  receiverDeviceId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
  status: string;
  createdAt: string;
}

// In-memory metadata store for active transfer audits
const transferMetadataStore = new Map<string, TransferRecord>();

export async function transferRoutes(server: FastifyInstance) {
  server.get("/", { preHandler: authenticate }, async (request, reply) => {
    const records = Array.from(transferMetadataStore.values());
    return reply.send({
      data: records,
      meta: { total: records.length },
    });
  });

  server.post("/", { preHandler: authenticate }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = FileTransferRequestSchema.parse(request.body);

    const record: TransferRecord = {
      id: body.transferId,
      sessionId: body.sessionId,
      senderDeviceId: req.user?.sub || "sender_device",
      receiverDeviceId: "target_device",
      fileName: body.fileName,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      sha256: body.sha256,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    transferMetadataStore.set(body.transferId, record);
    return reply.status(201).send({ data: record });
  });

  server.get("/:id", { preHandler: authenticate }, async (request, reply) => {
    const params = request.params as { id: string };
    const record = transferMetadataStore.get(params.id);

    if (!record) {
      return reply.status(404).send({
        error: {
          code: "TRANSFER_NOT_FOUND",
          message: "Transfer metadata record not found",
          requestId: request.id,
        },
      });
    }

    return reply.send({ data: record });
  });

  server.post("/:id/accept", { preHandler: authenticate }, async (request, reply) => {
    const params = request.params as { id: string };
    const record = transferMetadataStore.get(params.id);

    if (!record) {
      return reply.status(404).send({
        error: {
          code: "TRANSFER_NOT_FOUND",
          message: "Transfer record not found",
          requestId: request.id,
        },
      });
    }

    record.status = "TRANSFERRING";
    return reply.send({ data: record });
  });

  server.post("/:id/reject", { preHandler: authenticate }, async (request, reply) => {
    const params = request.params as { id: string };
    const record = transferMetadataStore.get(params.id);

    if (!record) {
      return reply.status(404).send({
        error: {
          code: "TRANSFER_NOT_FOUND",
          message: "Transfer record not found",
          requestId: request.id,
        },
      });
    }

    record.status = "REJECTED";
    return reply.send({ data: record });
  });

  server.post("/:id/cancel", { preHandler: authenticate }, async (request, reply) => {
    const params = request.params as { id: string };
    const record = transferMetadataStore.get(params.id);

    if (!record) {
      return reply.status(404).send({
        error: {
          code: "TRANSFER_NOT_FOUND",
          message: "Transfer record not found",
          requestId: request.id,
        },
      });
    }

    record.status = "CANCELLED";
    return reply.send({ data: record });
  });
}
