import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  request.log.error({ err: error, requestId: request.id }, "Request error encountered");

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: error.flatten(),
        requestId: request.id,
      },
    });
  }

  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message: statusCode === 500 ? "An unexpected error occurred" : error.message,
      requestId: request.id,
    },
  });
}
