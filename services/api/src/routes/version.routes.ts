import { FastifyInstance } from "fastify";
import { z } from "zod";

export const LATEST_CLIENT_VERSION = "1.0.0-beta.1";
export const MINIMUM_SUPPORTED_VERSION = "0.9.0";
export const CURRENT_PROTOCOL_VERSION = 1;

const VersionCheckSchema = z.object({
  clientVersion: z.string(),
  protocolVersion: z.coerce.number(),
  platform: z.enum(["WINDOWS", "MACOS", "LINUX"]).optional(),
});

export async function versionRoutes(server: FastifyInstance) {
  // Current Server & Protocol Version
  server.get("/", async (_request, reply) => {
    return reply.status(200).send({
      serverVersion: LATEST_CLIENT_VERSION,
      latestClientVersion: LATEST_CLIENT_VERSION,
      minimumSupportedVersion: MINIMUM_SUPPORTED_VERSION,
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      downloadUrl: "https://app.nexusdesk.uz/download",
      checksumSha256: "9e5c4a3f12a87b41e97d6205739bf896e0015b6375c3db11f185c13e54b611e0",
    });
  });

  // Client Compatibility Check
  server.post("/check", async (request, reply) => {
    const body = VersionCheckSchema.parse(request.body);

    const isProtocolCompatible = body.protocolVersion === CURRENT_PROTOCOL_VERSION;
    const isOutdated = body.clientVersion < MINIMUM_SUPPORTED_VERSION;
    const updateAvailable = body.clientVersion < LATEST_CLIENT_VERSION;

    return reply.status(200).send({
      compatible: isProtocolCompatible && !isOutdated,
      updateRequired: isOutdated || !isProtocolCompatible,
      updateAvailable,
      latestVersion: LATEST_CLIENT_VERSION,
      message: isOutdated
        ? "Your NexusDesk client is out of date and must be updated to continue."
        : updateAvailable
        ? "A new version of NexusDesk is available."
        : "Your NexusDesk client is up to date.",
    });
  });
}
