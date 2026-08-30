import { describe, it, expect, beforeAll } from "vitest";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("AI API Routes Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  it("POST /api/v1/ai/conversations should initialize a new AI conversation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ai/conversations",
      payload: {
        sessionId: "sess_test_1",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.conversation).toBeDefined();
    expect(body.conversation.sessionId).toBe("sess_test_1");
  });

  it("POST /api/v1/ai/conversations/:id/messages should send a message and receive an assistant answer", async () => {
    // 1. Create conversation
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/ai/conversations",
      payload: { sessionId: "sess_msg_1" },
    });
    const { conversation } = JSON.parse(createRes.body);

    // 2. Send message
    const msgRes = await app.inject({
      method: "POST",
      url: `/api/v1/ai/conversations/${conversation.conversationId}/messages`,
      payload: {
        content: "What is the status of my memory?",
      },
    });

    expect(msgRes.statusCode).toBe(200);
    const data = JSON.parse(msgRes.body);
    expect(data.response).toBeDefined();
    expect(data.messages.length).toBe(2); // user + assistant
  });

  it("POST /api/v1/ai/analyze-screen should return on-demand vision analysis", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ai/analyze-screen",
      payload: {
        sessionId: "sess_vision_1",
        screenshotBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        prompt: "Find any active error dialogs",
      },
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.analysis).toBeDefined();
    expect(data.analysis.summary).toBeDefined();
  });

  it("POST /api/v1/ai/action-proposals/:id/approve should approve an action proposal", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ai/action-proposals/prop_test_1/approve",
      payload: { reason: "Approved by host" },
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(true);
    expect(data.status).toBe("APPROVED");
    expect(data.approvalToken).toBeDefined();
  });

  it("GET /api/v1/ai/sessions/:sessionId/report should return the post-session report", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/ai/sessions/sess_report_1/report",
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.report).toBeDefined();
    expect(data.report.sessionId).toBe("sess_report_1");
  });
});
