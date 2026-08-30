import { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateSecureToken } from "@nexusdesk/crypto";

export interface DiagnosticBundleRecord {
  bundleId: string;
  osInfo: string;
  appVersion: string;
  networkState: string;
  recentErrorCodes: string[];
  createdAt: string;
}

const diagnosticBundlesStore = new Map<string, DiagnosticBundleRecord>();

const DiagnosticBundleSchema = z.object({
  osInfo: z.string(),
  appVersion: z.string(),
  networkState: z.string(),
  recentErrorCodes: z.array(z.string()).default([]),
});

export async function diagnosticsRoutes(server: FastifyInstance) {
  server.post("/", async (request, reply) => {
    const body = DiagnosticBundleSchema.parse(request.body);

    const bundleId = `diag_${generateSecureToken(12)}`;
    const record: DiagnosticBundleRecord = {
      bundleId,
      osInfo: body.osInfo,
      appVersion: body.appVersion,
      networkState: body.networkState,
      recentErrorCodes: body.recentErrorCodes,
      createdAt: new Date().toISOString(),
    };

    diagnosticBundlesStore.set(bundleId, record);

    return reply.status(201).send({
      bundleId,
      message: "Diagnostic bundle uploaded safely.",
    });
  });

  server.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const bundle = diagnosticBundlesStore.get(id);

    if (!bundle) {
      return reply.status(404).send({
        error: {
          code: "BUNDLE_NOT_FOUND",
          message: "Diagnostic bundle not found",
        },
      });
    }

    return reply.status(200).send({ bundle });
  });
}
