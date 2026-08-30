import { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateSecureToken } from "@nexusdesk/crypto";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

export interface SessionInvite {
  inviteToken: string;
  creatorUserId: string;
  targetDeviceId: string;
  expiresAt: number;
  used: boolean;
  requestedPermissions: string[];
}

const invitesMap = new Map<string, SessionInvite>();

const CreateInviteSchema = z.object({
  targetDeviceId: z.string().min(1),
  requestedPermissions: z.array(z.string()).default(["SCREEN_VIEW"]),
});

export async function inviteRoutes(server: FastifyInstance) {
  // Create single-use 15-minute invite link
  server.post("/", { preHandler: authenticate }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = CreateInviteSchema.parse(request.body);

    const inviteToken = `inv_${generateSecureToken(16)}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes TTL

    const invite: SessionInvite = {
      inviteToken,
      creatorUserId: req.user!.sub,
      targetDeviceId: body.targetDeviceId,
      expiresAt,
      used: false,
      requestedPermissions: body.requestedPermissions,
    };

    invitesMap.set(inviteToken, invite);

    return reply.status(201).send({
      inviteToken,
      inviteUrl: `https://app.nexusdesk.uz/connect/${inviteToken}`,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  });

  // Resolve and consume invite token
  server.get("/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const invite = invitesMap.get(token);

    if (!invite) {
      return reply.status(404).send({
        error: {
          code: "INVITE_NOT_FOUND",
          message: "The invitation token is invalid or expired.",
        },
      });
    }

    if (invite.used || Date.now() > invite.expiresAt) {
      invitesMap.delete(token);
      return reply.status(410).send({
        error: {
          code: "INVITE_EXPIRED",
          message: "This invitation link has already been used or has expired.",
        },
      });
    }

    // Mark single-use
    invite.used = true;

    return reply.status(200).send({
      targetDeviceId: invite.targetDeviceId,
      requestedPermissions: invite.requestedPermissions,
      valid: true,
    });
  });
}
