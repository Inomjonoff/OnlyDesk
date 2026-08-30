// ─── Provider & Model ───────────────────────────────────────────────

export type AiProviderName = "openai" | "anthropic" | "google" | "openrouter" | "ollama";

export interface ProviderCapabilities {
  text: boolean;
  vision: boolean;
  tools: boolean;
  structuredOutput: boolean;
  streaming: boolean;
}

export interface ModelMetadata {
  provider: AiProviderName;
  model: string;
  capabilities: ProviderCapabilities;
  contextWindow?: number;
  maxOutputTokens?: number;
}

export interface AIRequest {
  requestId: string;
  sessionId: string;
  conversationId?: string;
  systemPrompt: string;
  messages: AiMessage[];
  tools?: AiToolDefinition[];
  visionImages?: Array<{ base64: string; mimeType: string }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIResponse {
  requestId: string;
  provider: AiProviderName;
  model: string;
  content: string;
  toolCalls?: AiToolCall[];
  usage: AiTokenUsage;
  latencyMs: number;
  finishReason: "stop" | "tool_calls" | "length" | "error";
}

export interface AIStreamChunk {
  requestId: string;
  delta: string;
  toolCall?: Partial<AiToolCall>;
  done: boolean;
}

export interface AiTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// ─── Conversation ───────────────────────────────────────────────────

export type AiConversationState = "ACTIVE" | "COMPLETED" | "CANCELLED" | "ERROR";

export type AiMessageRole = "system" | "user" | "assistant" | "tool" | "tool_result";

export interface AiConversation {
  conversationId: string;
  sessionId: string;
  userId: string;
  state: AiConversationState;
  provider: AiProviderName;
  model: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface AiMessage {
  messageId: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  toolCalls?: AiToolCall[];
  toolResultId?: string;
  responseType?: AiResponseType;
  timestamp: number;
}

export type AiResponseType =
  | "ANSWER"
  | "FINDING"
  | "RECOMMENDATION"
  | "ACTION_PROPOSAL"
  | "ACTION_RESULT"
  | "WARNING"
  | "ERROR";

// ─── Observation Model ──────────────────────────────────────────────

export type AiConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface AiObservation {
  observed: string[];
  inferred: string[];
  unknown: string[];
}

export type AiFindingSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AiIssueCategory =
  | "PERFORMANCE"
  | "NETWORK"
  | "APPLICATION"
  | "STORAGE"
  | "OS"
  | "SECURITY_WARNING"
  | "CONFIGURATION"
  | "UNKNOWN";

export interface AiEvidence {
  source: string;
  observedAt: number;
  value: string;
  diagnosticSnapshotId?: string;
}

export interface AiFinding {
  id: string;
  category: AiIssueCategory;
  severity: AiFindingSeverity;
  statement: string;
  confidence: AiConfidence;
  evidence: AiEvidence[];
}

// ─── Tool System ────────────────────────────────────────────────────

export type AiRiskLevel = "READ_ONLY" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AiToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  riskLevel: AiRiskLevel;
  requiredPermission?: string;
  timeout: number;
  toolVersion: string;
}

export interface AiToolCall {
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiToolResult {
  toolCallId: string;
  name: string;
  success: boolean;
  result: Record<string, unknown>;
  error?: string;
  durationMs: number;
  verification?: {
    verified: boolean;
    details?: string;
  };
}

// ─── Action Lifecycle ───────────────────────────────────────────────

export type AiActionStatus =
  | "PROPOSED"
  | "APPROVAL_PENDING"
  | "REJECTED"
  | "EXPIRED"
  | "APPROVED"
  | "EXECUTING"
  | "VERIFYING"
  | "FAILED"
  | "VERIFIED"
  | "CANCELLED";

export interface AiActionProposal {
  proposalId: string;
  sessionId: string;
  deviceId: string;
  userId: string;
  aiRequestId: string;
  tool: string;
  arguments: Record<string, unknown>;
  argumentsHash: string;
  reason: string;
  risk: AiRiskLevel;
  requiresApproval: boolean;
  expectedResult?: string;
  status: AiActionStatus;
  createdAt: number;
  expiresAt: number;
}

export interface AiApprovalToken {
  approvalId: string;
  proposalId: string;
  sessionId: string;
  deviceId: string;
  userId: string;
  toolName: string;
  argumentsHash: string;
  nonce: string;
  approvedAt: number;
  expiresAt: number;
  used: boolean;
}

export interface AiActionExecution {
  actionId: string;
  proposalId: string;
  approvalId: string;
  sessionId: string;
  deviceId: string;
  userId: string;
  tool: string;
  status: AiActionStatus;
  result?: AiToolResult;
  startedAt: number;
  completedAt?: number;
  policyVersion: string;
  toolVersion: string;
}

// ─── Automation & Policy ────────────────────────────────────────────

export type AiAutomationMode = "OBSERVE_ONLY" | "RECOMMEND" | "ASK_BEFORE_ACTION" | "LIMITED_AUTO";

export type AiPolicyDecision = "ALLOW" | "REQUIRE_APPROVAL" | "DENY";

export type AiSourceType =
  | "PUBLIC_SESSION_DATA"
  | "AUTHORIZED_DIAGNOSTIC"
  | "PRIVATE_SCREEN"
  | "PRIVATE_LOG"
  | "SENSITIVE_DATA";

export interface AiPolicyContext {
  userId: string;
  deviceId: string;
  sessionId: string;
  permissions: string[];
  automationMode: AiAutomationMode;
  organizationPolicy?: AiOrganizationPolicy;
}

export interface AiOrganizationPolicy {
  aiEnabled: boolean;
  externalProvidersEnabled: boolean;
  visionEnabled: boolean;
  computerUseEnabled: boolean;
  autoActionsEnabled: boolean;
}

// ─── Computer Use ───────────────────────────────────────────────────

export interface AiControlLease {
  leaseId: string;
  sessionId: string;
  deviceId: string;
  proposalId: string;
  stepsRemaining: number;
  maxSteps: number;
  createdAt: number;
  expiresAt: number;
}

export type AiComputerUseAction = "observe_screen" | "click" | "type" | "scroll" | "press_key";

export interface AiComputerUseStep {
  action: AiComputerUseAction;
  target?: string;
  value?: string;
  x?: number;
  y?: number;
  expectedResult?: string;
}

// ─── Diagnostics ────────────────────────────────────────────────────

export interface AiDiagnosticSnapshot {
  snapshotId: string;
  sessionId: string;
  observedAt: number;
  stale: boolean;
  cpu?: { usagePercent: number; cores: number; model?: string };
  memory?: { usedBytes: number; totalBytes: number; usagePercent: number };
  disk?: Array<{ drive: string; freeBytes: number; totalBytes: number; usagePercent: number }>;
  network?: { adapters: Array<{ name: string; status: string; latencyMs?: number }> };
  gpu?: { name?: string; usagePercent?: number; memoryUsedBytes?: number };
  uptime?: number;
  processes?: AiProcessInfo[];
  applications?: AiApplicationInfo[];
}

export interface AiProcessInfo {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryBytes: number;
  status: string;
}

export interface AiApplicationInfo {
  applicationId: string;
  displayName: string;
  running: boolean;
  pid?: number;
  cpuPercent?: number;
  memoryBytes?: number;
}

export interface ApplicationDefinition {
  applicationId: string;
  displayName: string;
  executablePath?: string;
  publisher?: string;
  safeActions: Array<"open" | "restart" | "close">;
}

// ─── Vision ─────────────────────────────────────────────────────────

export interface AiVisionResult {
  analysisId: string;
  sessionId: string;
  summary: string;
  visibleIssues: string[];
  observedText: string[];
  possibleCauses: string[];
  recommendations: string[];
  analyzedAt: number;
  provider: AiProviderName;
  model: string;
}

// ─── Troubleshooting ────────────────────────────────────────────────

export interface AiTroubleshootingPlan {
  planId: string;
  sessionId: string;
  problem: string;
  evidence: AiEvidence[];
  hypotheses: string[];
  tests: string[];
  approvedActions: string[];
  verificationSteps: string[];
  planHash: string;
}

// ─── Session Intelligence ───────────────────────────────────────────

export type AiReportStatus = "GENERATING" | "READY" | "FAILED" | "EXPIRED" | "DELETED";
export type AiResolutionStatus = "RESOLVED" | "PARTIALLY_RESOLVED" | "UNRESOLVED" | "UNKNOWN";

export interface AiSessionReport {
  reportId: string;
  sessionId: string;
  version: number;
  status: AiReportStatus;
  summary: string;
  issues: AiFinding[];
  actionsExecuted: Array<{
    actionId: string;
    tool: string;
    result: string;
    verified: boolean;
  }>;
  resolution: AiResolutionStatus;
  unresolvedIssues: string[];
  recommendations: Array<{
    recommendation: string;
    evidence: string;
  }>;
  provider: AiProviderName;
  model: string;
  createdAt: number;
}

// ─── Usage & Cost ───────────────────────────────────────────────────

export interface AiUsageRecord {
  requestId: string;
  sessionId: string;
  userId: string;
  provider: AiProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  visionUnits?: number;
  estimatedCost: number;
  durationMs: number;
  createdAt: number;
}

// ─── Error Types ────────────────────────────────────────────────────

export type AiErrorType =
  | "AI_PROVIDER_ERROR"
  | "AI_TIMEOUT"
  | "AI_RATE_LIMITED"
  | "AI_INVALID_OUTPUT"
  | "AI_TOOL_DENIED"
  | "AI_ACTION_EXPIRED"
  | "AI_ACTION_REJECTED"
  | "AI_VERIFICATION_FAILED"
  | "AI_POLICY_BLOCKED"
  | "AI_CONTEXT_TOO_LARGE"
  | "AI_VISION_UNAVAILABLE"
  | "AI_COMPUTER_USE_DENIED";

// ─── Legacy Compatibility ───────────────────────────────────────────
// Kept for backward compatibility with existing code

export type AISeverity = "low" | "medium" | "high" | "critical";

export interface AIDiagnosticFinding {
  component: string;
  metric: string;
  value: string | number;
  anomaly: string;
}

export interface AIDiagnosticResponse {
  summary: string;
  severity: AISeverity;
  findings: AIDiagnosticFinding[];
  observed: string[];
  inferred: string[];
  unknown: string[];
  possibleCauses: string[];
  recommendations: string[];
  suggestedActions: AILegacyActionProposal[];
  confidence: number;
}

export type ActionRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AILegacyActionProposal {
  id: string;
  action: string;
  target?: string;
  parameters?: Record<string, unknown>;
  description: string;
  riskLevel: ActionRiskLevel;
  requiresElevation: boolean;
  userApprovalRequired: boolean;
}

export interface AIProviderConfig {
  provider: AiProviderName;
  modelName: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIAnalysisRequest {
  sessionId?: string;
  deviceId?: string;
  userPrompt: string;
  sanitizedTelemetry?: Record<string, unknown>;
  sanitizedProcessList?: Array<{ name: string; pid: number; cpu: number; memory: number }>;
  screenshotBase64?: string;
}
