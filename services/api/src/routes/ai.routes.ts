import { FastifyInstance } from "fastify";
import {
  AIAnalyzeRequestSchema,
  CreateAiConversationSchema,
  SendAiMessageSchema,
  AnalyzeScreenRequestSchema,
  DiagnosticsRequestSchema,
  ActionApprovalRequestSchema,
  ActionRejectionRequestSchema,
} from "@nexusdesk/validation";
import { AiConversation, AiMessage, AiSessionReport } from "@nexusdesk/types";

export async function aiRoutes(server: FastifyInstance) {
  // Mock repository / database store for AI conversations & reports in API service
  const conversations = new Map<string, { conversation: AiConversation; messages: AiMessage[] }>();
  const reports = new Map<string, AiSessionReport>();

  // 1. Create AI Conversation
  server.post("/conversations", async (request, reply) => {
    const body = CreateAiConversationSchema.parse(request.body);
    const conversationId = `conv_${body.sessionId}_${Date.now()}`;

    const conv: AiConversation = {
      conversationId,
      sessionId: body.sessionId,
      userId: "user_session",
      state: "ACTIVE",
      provider: body.provider || "google",
      model: body.model || "gemini-2.0-flash",
      messageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    conversations.set(conversationId, { conversation: conv, messages: [] });
    return reply.status(201).send({ conversation: conv });
  });

  // 2. Get Conversation & Messages
  server.get("/conversations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const entry = conversations.get(id);
    if (!entry) {
      return reply.status(404).send({ error: { message: "Conversation not found" } });
    }
    return reply.send(entry);
  });

  // 3. Send Message to AI
  server.post("/conversations/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const entry = conversations.get(id);
    if (!entry) {
      return reply.status(404).send({ error: { message: "Conversation not found" } });
    }

    const body = SendAiMessageSchema.parse(request.body);

    const userMsg: AiMessage = {
      messageId: `msg_${Date.now()}_u`,
      conversationId: id,
      role: "user",
      content: body.content,
      timestamp: Date.now(),
    };
    entry.messages.push(userMsg);

    // AI Assistant response
    const assistantMsg: AiMessage = {
      messageId: `msg_${Date.now()}_a`,
      conversationId: id,
      role: "assistant",
      content: `I have analyzed your request: "${body.content}". System indicators are currently nominal.`,
      timestamp: Date.now(),
      responseType: "ANSWER",
    };
    entry.messages.push(assistantMsg);

    entry.conversation.messageCount = entry.messages.length;
    entry.conversation.updatedAt = Date.now();

    return reply.send({
      response: {
        requestId: `req_${Date.now()}`,
        provider: entry.conversation.provider,
        model: entry.conversation.model,
        content: assistantMsg.content,
        usage: { inputTokens: 40, outputTokens: 25, totalTokens: 65 },
        latencyMs: 15,
        finishReason: "stop",
      },
      proposals: [],
      executedActions: [],
      messages: entry.messages,
    });
  });

  // 4. On-Demand Screen Vision Analysis
  server.post("/analyze-screen", async (request, reply) => {
    const body = AnalyzeScreenRequestSchema.parse(request.body);

    return reply.send({
      analysis: {
        analysisId: `screen_${body.sessionId}_${Date.now()}`,
        sessionId: body.sessionId,
        summary: "Visual inspection shows nominal desktop window composition.",
        visibleIssues: [],
        observedText: ["Desktop Viewer Active"],
        possibleCauses: [],
        recommendations: ["No corrective action needed."],
        analyzedAt: Date.now(),
        provider: "google",
        model: "gemini-2.0-flash",
      },
    });
  });

  // 5. Diagnostics Collection
  server.post("/diagnostics", async (request, reply) => {
    const body = DiagnosticsRequestSchema.parse(request.body);

    return reply.send({
      sessionId: body.sessionId,
      observedAt: Date.now(),
      cpu: { usagePercent: 24.5, cores: 16 },
      memory: { totalBytes: 34359738368, usedBytes: 12884901888, usagePercent: 37.5 },
      processes: [
        {
          pid: 1042,
          name: "chrome.exe",
          cpuPercent: 12.1,
          memoryBytes: 1073741824,
          status: "RUNNING",
        },
      ],
    });
  });

  // 6. Action Proposal Approval
  server.post("/action-proposals/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    ActionApprovalRequestSchema.parse(request.body || {});

    return reply.send({
      success: true,
      proposalId: id,
      status: "APPROVED",
      approvalToken: {
        approvalId: `appr_${id}`,
        proposalId: id,
        sessionId: "session_current",
        deviceId: "dev_target",
        userId: "user_session",
        toolName: "restart_supported_application",
        argumentsHash: "hash_nominal",
        nonce: `nonce_${Date.now()}`,
        approvedAt: Date.now(),
        expiresAt: Date.now() + 60000,
        used: false,
      },
    });
  });

  // 7. Action Proposal Rejection
  server.post("/action-proposals/:id/reject", async (request, reply) => {
    const { id } = request.params as { id: string };
    ActionRejectionRequestSchema.parse(request.body || {});

    return reply.send({
      success: true,
      proposalId: id,
      status: "REJECTED",
    });
  });

  // 8. Session AI Report
  server.get("/sessions/:sessionId/report", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    let report = reports.get(sessionId);

    if (!report) {
      report = {
        reportId: `rep_${sessionId}`,
        sessionId,
        version: 1,
        status: "READY",
        summary: "Session completed with AI diagnostics applied. All anomalies resolved.",
        issues: [],
        actionsExecuted: [
          {
            actionId: "act_1",
            tool: "get_top_processes",
            result: "Identified high memory consumer",
            verified: true,
          },
        ],
        resolution: "RESOLVED",
        unresolvedIssues: [],
        recommendations: [
          {
            recommendation: "Restart browser daily during heavy development workloads",
            evidence: "Memory dropped 1.2GB post-cleanup",
          },
        ],
        provider: "google",
        model: "gemini-2.0-flash",
        createdAt: Date.now(),
      };
      reports.set(sessionId, report);
    }

    return reply.send({ report });
  });

  // 9. Legacy Analyze
  server.post("/analyze", async (request, reply) => {
    const body = AIAnalyzeRequestSchema.parse(request.body);

    return reply.send({
      analysis: {
        summary: `Diagnostic analysis for: "${body.userPrompt}"`,
        severity: "low",
        findings: [],
        observed: ["Diagnostic snapshot received"],
        inferred: ["System is operating within normal parameters"],
        unknown: ["Third-party background tasks"],
        possibleCauses: [],
        recommendations: ["Check memory utilization before starting heavy sessions"],
        suggestedActions: [],
        confidence: 0.95,
      },
    });
  });
}
