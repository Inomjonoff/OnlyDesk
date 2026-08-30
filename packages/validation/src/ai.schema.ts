import { z } from "zod";

export const AiProviderNameEnum = z.enum(["openai", "anthropic", "google", "openrouter", "ollama"]);

export const AiRiskLevelEnum = z.enum(["READ_ONLY", "LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const AiActionStatusEnum = z.enum([
  "PROPOSED",
  "APPROVAL_PENDING",
  "REJECTED",
  "EXPIRED",
  "APPROVED",
  "EXECUTING",
  "VERIFYING",
  "FAILED",
  "VERIFIED",
  "CANCELLED",
]);

export const AiAutomationModeEnum = z.enum([
  "OBSERVE_ONLY",
  "RECOMMEND",
  "ASK_BEFORE_ACTION",
  "LIMITED_AUTO",
]);

export const AiFindingSeverityEnum = z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const AiIssueCategoryEnum = z.enum([
  "PERFORMANCE",
  "NETWORK",
  "APPLICATION",
  "STORAGE",
  "OS",
  "SECURITY_WARNING",
  "CONFIGURATION",
  "UNKNOWN",
]);

export const AiConfidenceEnum = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const AiEvidenceSchema = z.object({
  source: z.string(),
  observedAt: z.number(),
  value: z.string(),
  diagnosticSnapshotId: z.string().optional(),
});

export const AiFindingSchema = z.object({
  id: z.string(),
  category: AiIssueCategoryEnum,
  severity: AiFindingSeverityEnum,
  statement: z.string(),
  confidence: AiConfidenceEnum,
  evidence: z.array(AiEvidenceSchema),
});

export const AiActionProposalSchema = z.object({
  proposalId: z.string().min(1),
  sessionId: z.string().min(1),
  deviceId: z.string().min(1),
  userId: z.string().min(1),
  aiRequestId: z.string().min(1),
  tool: z.string().min(1),
  arguments: z.record(z.unknown()),
  argumentsHash: z.string().min(1),
  reason: z.string().min(1),
  risk: AiRiskLevelEnum,
  requiresApproval: z.boolean(),
  expectedResult: z.string().optional(),
  status: AiActionStatusEnum,
  createdAt: z.number(),
  expiresAt: z.number(),
});

export const AiApprovalSchema = z.object({
  proposalId: z.string().min(1),
  sessionId: z.string().min(1),
  approved: z.boolean(),
  reason: z.string().optional(),
});

export const AiToolCallSchema = z.object({
  toolCallId: z.string().min(1),
  name: z.string().min(1),
  arguments: z.record(z.unknown()),
});

export const AiToolResultSchema = z.object({
  toolCallId: z.string().min(1),
  name: z.string().min(1),
  success: z.boolean(),
  result: z.record(z.unknown()),
  error: z.string().optional(),
  durationMs: z.number().min(0),
  verification: z
    .object({
      verified: z.boolean(),
      details: z.string().optional(),
    })
    .optional(),
});

export const AiVisionResultSchema = z.object({
  analysisId: z.string().min(1),
  sessionId: z.string().min(1),
  summary: z.string(),
  visibleIssues: z.array(z.string()),
  observedText: z.array(z.string()),
  possibleCauses: z.array(z.string()),
  recommendations: z.array(z.string()),
  analyzedAt: z.number(),
  provider: AiProviderNameEnum,
  model: z.string(),
});

export const AiMessageRoleEnum = z.enum(["system", "user", "assistant", "tool", "tool_result"]);
export const AiResponseTypeEnum = z.enum([
  "ANSWER",
  "FINDING",
  "RECOMMENDATION",
  "ACTION_PROPOSAL",
  "ACTION_RESULT",
  "WARNING",
  "ERROR",
]);

export const AiMessageSchema = z.object({
  messageId: z.string().min(1),
  conversationId: z.string().min(1),
  role: AiMessageRoleEnum,
  content: z.string(),
  toolCalls: z.array(AiToolCallSchema).optional(),
  toolResultId: z.string().optional(),
  responseType: AiResponseTypeEnum.optional(),
  timestamp: z.number(),
});

export const AiSessionReportSchema = z.object({
  reportId: z.string().min(1),
  sessionId: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(["GENERATING", "READY", "FAILED", "EXPIRED", "DELETED"]),
  summary: z.string(),
  issues: z.array(AiFindingSchema),
  actionsExecuted: z.array(
    z.object({
      actionId: z.string(),
      tool: z.string(),
      result: z.string(),
      verified: z.boolean(),
    }),
  ),
  resolution: z.enum(["RESOLVED", "PARTIALLY_RESOLVED", "UNRESOLVED", "UNKNOWN"]),
  unresolvedIssues: z.array(z.string()),
  recommendations: z.array(
    z.object({
      recommendation: z.string(),
      evidence: z.string(),
    }),
  ),
  provider: AiProviderNameEnum,
  model: z.string(),
  createdAt: z.number(),
});

// API Endpoint Request / Response Schemas
export const CreateAiConversationSchema = z.object({
  sessionId: z.string().min(1),
  provider: AiProviderNameEnum.optional(),
  model: z.string().optional(),
});

export const SendAiMessageSchema = z.object({
  content: z.string().min(1).max(16384),
  contextMode: z.enum(["MINIMAL", "FULL", "NONE"]).optional().default("MINIMAL"),
  includeDiagnostics: z.boolean().optional().default(true),
  includeScreen: z.boolean().optional().default(false),
  screenshotBase64: z.string().optional(),
});

export const AnalyzeScreenRequestSchema = z.object({
  sessionId: z.string().min(1),
  screenshotBase64: z.string().min(1),
  prompt: z.string().max(2000).optional(),
});

export const DiagnosticsRequestSchema = z.object({
  sessionId: z.string().min(1),
  requestedMetrics: z
    .array(z.enum(["cpu", "memory", "disk", "network", "gpu", "processes", "applications"]))
    .optional(),
});

export const ActionApprovalRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const ActionRejectionRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Legacy backward-compatible schemas
export const AIActionProposalSchemaLegacy = z.object({
  id: z.string(),
  action: z.string(),
  target: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
  description: z.string(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  requiresElevation: z.boolean(),
  userApprovalRequired: z.boolean(),
});

export const AIDiagnosticResponseSchema = z.object({
  summary: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  findings: z.array(
    z.object({
      component: z.string(),
      metric: z.string(),
      value: z.union([z.string(), z.number()]),
      anomaly: z.string(),
    }),
  ),
  observed: z.array(z.string()),
  inferred: z.array(z.string()),
  unknown: z.array(z.string()),
  possibleCauses: z.array(z.string()),
  recommendations: z.array(z.string()),
  suggestedActions: z.array(AIActionProposalSchemaLegacy),
  confidence: z.number().min(0).max(1),
});

export const AIAnalyzeRequestSchema = z.object({
  sessionId: z.string().optional(),
  deviceId: z.string().optional(),
  userPrompt: z.string().min(1).max(16384),
  sanitizedTelemetry: z.record(z.unknown()).optional(),
  screenshotBase64: z.string().optional(),
});

export type AIDiagnosticResponseOutput = z.infer<typeof AIDiagnosticResponseSchema>;
export type AIAnalyzeRequestInput = z.infer<typeof AIAnalyzeRequestSchema>;
export type AiActionProposalInput = z.infer<typeof AiActionProposalSchema>;
export type AiApprovalInput = z.infer<typeof AiApprovalSchema>;
export type AiFindingInput = z.infer<typeof AiFindingSchema>;
export type AiSessionReportInput = z.infer<typeof AiSessionReportSchema>;
export type CreateAiConversationInput = z.infer<typeof CreateAiConversationSchema>;
export type SendAiMessageInput = z.infer<typeof SendAiMessageSchema>;
export type AnalyzeScreenRequestInput = z.infer<typeof AnalyzeScreenRequestSchema>;
