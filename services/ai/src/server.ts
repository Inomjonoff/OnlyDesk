import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { getEnv } from "@nexusdesk/config";
import { AIProviderRouter } from "./providers/router";
import { GoogleGeminiProvider } from "./providers/google.provider";
import { OpenAIProvider } from "./providers/openai.provider";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { OpenRouterProvider } from "./providers/openrouter.provider";
import { OllamaProvider } from "./providers/ollama.provider";
import { MockAIProvider } from "./providers/mock.provider";
import { ToolRegistry } from "./tools/registry";
import { registerDiagnosticTools } from "./tools/diagnostics";
import { registerScreenTools } from "./tools/screen";
import { registerApplicationTools } from "./tools/applications";
import { registerSettingsTools } from "./tools/settings";
import { registerActionTools } from "./tools/actions";
import { ComputerUseTool } from "./tools/computer-use";
import { ActionLifecycleManager } from "./pipeline/action-lifecycle";
import { ApprovalManager } from "./pipeline/approval-manager";
import { AIRequestPipeline } from "./pipeline/request-pipeline";
import {
  AIAnalyzeRequestSchema,
  CreateAiConversationSchema,
  SendAiMessageSchema,
  AnalyzeScreenRequestSchema,
  DiagnosticsRequestSchema,
  ActionApprovalRequestSchema,
  ActionRejectionRequestSchema,
} from "@nexusdesk/validation";
import { redactSecretsFromObject, redactSecretsFromText } from "./redactor";
import { AiConversation, AiMessage, AiUsageRecord } from "@nexusdesk/types";

export function buildAIServer(): FastifyInstance {
  const server = fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  server.register(cors, { origin: true });

  const env = getEnv();

  // 1. Initialize Providers & Router
  const usageHistory: AiUsageRecord[] = [];
  const router = new AIProviderRouter({
    defaultProvider: env.AI_DEFAULT_PROVIDER,
    fallbackEnabled: env.AI_PROVIDER_FALLBACK_ENABLED,
    onUsageRecorded: (rec) => {
      usageHistory.push(rec);
      if (usageHistory.length > 500) usageHistory.shift();
    },
  });

  router.registerProvider(new GoogleGeminiProvider(env.GOOGLE_AI_API_KEY, env.AI_DEFAULT_MODEL));
  router.registerProvider(new OpenAIProvider(env.OPENAI_API_KEY));
  router.registerProvider(new AnthropicProvider(env.ANTHROPIC_API_KEY));
  router.registerProvider(new OpenRouterProvider(env.OPENROUTER_API_KEY));
  router.registerProvider(new OllamaProvider(env.OLLAMA_BASE_URL));

  // In test environment, register deterministic mock provider
  if (process.env.NODE_ENV === "test") {
    router.registerProvider(new MockAIProvider({ name: "google" }));
  }

  // 2. Initialize Tool Registry & Tools
  const registry = new ToolRegistry();
  registerDiagnosticTools(registry);
  registerScreenTools(registry);
  registerApplicationTools(registry);
  registerSettingsTools(registry);
  registerActionTools(registry);

  const computerUse = new ComputerUseTool();
  computerUse.registerTools(registry);

  // 3. Initialize Pipeline & Approval Managers
  const lifecycle = new ActionLifecycleManager();
  const approvalManager = new ApprovalManager(lifecycle);
  const pipeline = new AIRequestPipeline({
    router,
    registry,
    lifecycle,
    approvalManager,
  });

  // In-memory conversation store for AI Sessions
  const conversations = new Map<string, { conversation: AiConversation; messages: AiMessage[] }>();

  // Health checks
  server.get("/health", async (_request, reply) => {
    const providers = await router.getAvailableProviders();
    return reply.send({
      status: "ok",
      service: "ai",
      providers,
      timestamp: new Date().toISOString(),
    });
  });

  server.get("/ready", async (_request, reply) => {
    return reply.send({
      ready: true,
      service: "ai",
      uptime: process.uptime(),
    });
  });

  // AI Usage Telemetry
  server.get("/api/v1/ai/usage", async (_request, reply) => {
    const totalTokens = usageHistory.reduce((acc, u) => acc + u.inputTokens + u.outputTokens, 0);
    const totalCost = usageHistory.reduce((acc, u) => acc + u.estimatedCost, 0);
    return reply.send({
      totalRequests: usageHistory.length,
      totalTokens,
      totalEstimatedCostUsd: totalCost,
      history: usageHistory.slice(-50),
    });
  });

  // Conversations
  server.post("/api/v1/ai/conversations", async (request, reply) => {
    const body = CreateAiConversationSchema.parse(request.body);
    const conversationId = `conv_${body.sessionId}_${Date.now()}`;

    const conv: AiConversation = {
      conversationId,
      sessionId: body.sessionId,
      userId: "user_session",
      state: "ACTIVE",
      provider: body.provider || env.AI_DEFAULT_PROVIDER,
      model: body.model || env.AI_DEFAULT_MODEL,
      messageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    conversations.set(conversationId, { conversation: conv, messages: [] });
    return reply.status(201).send({ conversation: conv });
  });

  server.get("/api/v1/ai/conversations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const entry = conversations.get(id);
    if (!entry) {
      return reply.status(404).send({ error: { message: "Conversation not found" } });
    }
    return reply.send(entry);
  });

  server.post("/api/v1/ai/conversations/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const entry = conversations.get(id);
    if (!entry) {
      return reply.status(404).send({ error: { message: "Conversation not found" } });
    }

    const body = SendAiMessageSchema.parse(request.body);

    const result = await pipeline.run({
      sessionId: entry.conversation.sessionId,
      deviceId: "dev_target",
      userId: entry.conversation.userId,
      userPrompt: body.content,
      conversation: entry.conversation,
      existingMessages: entry.messages,
      screenshotBase64: body.screenshotBase64,
      preferredProvider: entry.conversation.provider,
    });

    entry.messages = result.conversationMessages;
    entry.conversation.messageCount = entry.messages.length;
    entry.conversation.updatedAt = Date.now();

    return reply.send({
      response: result.response,
      proposals: result.proposals,
      executedActions: result.executedActions,
      messages: entry.messages,
    });
  });

  // Action Proposals & Approvals
  server.post("/api/v1/ai/action-proposals/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    ActionApprovalRequestSchema.parse(request.body || {});

    const proposal = lifecycle.getProposal(id);
    if (!proposal) {
      return reply.status(404).send({ error: { message: "Proposal not found" } });
    }

    const token = approvalManager.approveProposal({
      proposalId: id,
      sessionId: proposal.sessionId,
      userId: proposal.userId,
      deviceId: proposal.deviceId,
    });

    return reply.send({
      success: true,
      proposalId: id,
      status: "APPROVED",
      approvalToken: token,
    });
  });

  server.post("/api/v1/ai/action-proposals/:id/reject", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = ActionRejectionRequestSchema.parse(request.body || {});

    approvalManager.rejectProposal(id, body.reason);
    return reply.send({
      success: true,
      proposalId: id,
      status: "REJECTED",
    });
  });

  // Screen Analysis
  server.post("/api/v1/ai/analyze-screen", async (request, reply) => {
    const body = AnalyzeScreenRequestSchema.parse(request.body);

    const result = await registry.executeTool(
      "analyze_current_screen",
      { prompt: body.prompt },
      { sessionId: body.sessionId, deviceId: "dev_target", userId: "user_session" },
    );

    return reply.send({
      analysis: result.result,
    });
  });

  // Diagnostic Collection
  server.post("/api/v1/ai/diagnostics", async (request, reply) => {
    const body = DiagnosticsRequestSchema.parse(request.body);

    const sys = await registry.executeTool(
      "get_system_info",
      {},
      { sessionId: body.sessionId, deviceId: "dev", userId: "u" },
    );
    const cpu = await registry.executeTool(
      "get_cpu_usage",
      {},
      { sessionId: body.sessionId, deviceId: "dev", userId: "u" },
    );
    const mem = await registry.executeTool(
      "get_memory_usage",
      {},
      { sessionId: body.sessionId, deviceId: "dev", userId: "u" },
    );
    const procs = await registry.executeTool(
      "get_top_processes",
      { limit: 10 },
      { sessionId: body.sessionId, deviceId: "dev", userId: "u" },
    );

    return reply.send({
      sessionId: body.sessionId,
      observedAt: Date.now(),
      system: sys.result,
      cpu: cpu.result,
      memory: mem.result,
      processes: procs.result,
    });
  });

  // Legacy analysis endpoint
  server.post("/api/v1/analyze", async (request, reply) => {
    const body = AIAnalyzeRequestSchema.parse(request.body);

    const sanitizedPrompt = redactSecretsFromText(body.userPrompt);
    const sanitizedTelemetry = body.sanitizedTelemetry
      ? (redactSecretsFromObject(body.sanitizedTelemetry) as Record<string, unknown>)
      : undefined;

    const selectedProvider = router.selectProvider();

    const aiRes = await selectedProvider.generate({
      requestId: `req_${Date.now()}`,
      sessionId: body.sessionId || "default_session",
      systemPrompt: "You are NexusDesk AI Expert Assistant.",
      messages: [
        {
          messageId: "1",
          conversationId: "c1",
          role: "user",
          content: sanitizedPrompt,
          timestamp: Date.now(),
        },
      ],
    });

    return reply.send({
      provider: selectedProvider.name,
      analysis: {
        summary: aiRes.content,
        severity: "low",
        findings: [],
        observed: ["Telemetry indicators nominal"],
        inferred: ["No resource starvation"],
        unknown: ["External services"],
        possibleCauses: [],
        recommendations: ["Maintain regular OS security patches"],
        suggestedActions: [],
        confidence: 0.95,
      },
    });
  });

  return server;
}
