import { FastifyReply, FastifyRequest } from "fastify";
import * as jwt from "jsonwebtoken";
import { getEnv } from "@nexusdesk/config";
import { JwtPayload } from "@nexusdesk/types";

export interface AuthenticatedRequest extends FastifyRequest {
  user?: JwtPayload;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
        requestId: request.id,
      },
    });
  }

  const token = authHeader.substring(7);
  try {
    const env = getEnv();
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    (request as AuthenticatedRequest).user = decoded;
  } catch {
    return reply.status(401).send({
      error: {
        code: "TOKEN_EXPIRED_OR_INVALID",
        message: "Session token has expired or is invalid",
        requestId: request.id,
      },
    });
  }
}
