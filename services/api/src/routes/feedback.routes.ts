import { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateSecureToken } from "@nexusdesk/crypto";

export interface UserFeedback {
  feedbackId: string;
  category: "BUG" | "FEATURE_REQUEST" | "PERFORMANCE" | "SECURITY_CONCERN" | "OTHER";
  rating?: number;
  comment: string;
  diagnosticBundleId?: string;
  clientVersion?: string;
  createdAt: string;
}

const feedbackStore: UserFeedback[] = [];

const SubmitFeedbackSchema = z.object({
  category: z.enum(["BUG", "FEATURE_REQUEST", "PERFORMANCE", "SECURITY_CONCERN", "OTHER"]),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().min(5).max(2000),
  diagnosticBundleId: z.string().optional(),
  clientVersion: z.string().optional(),
});

export async function feedbackRoutes(server: FastifyInstance) {
  server.post("/", async (request, reply) => {
    const body = SubmitFeedbackSchema.parse(request.body);

    const feedback: UserFeedback = {
      feedbackId: `fb_${generateSecureToken(12)}`,
      category: body.category,
      rating: body.rating,
      comment: body.comment,
      diagnosticBundleId: body.diagnosticBundleId,
      clientVersion: body.clientVersion || "1.0.0-beta.1",
      createdAt: new Date().toISOString(),
    };

    feedbackStore.push(feedback);

    return reply.status(201).send({
      message: "Feedback received successfully. Thank you for helping improve NexusDesk!",
      feedbackId: feedback.feedbackId,
    });
  });

  server.get("/list", async (_request, reply) => {
    return reply.status(200).send({
      count: feedbackStore.length,
      feedback: feedbackStore.slice(-50), // last 50
    });
  });
}
