import {
  AiActionProposal,
  AiAutomationMode,
  AiConversation,
  AiDiagnosticSnapshot,
  AiMessage,
  AiPolicyContext,
  AiProviderName,
  AIRequest,
  AIResponse,
  AiToolResult,
} from "@nexusdesk/types";
import { AIProviderRouter } from "../providers/router";
import { ToolRegistry } from "../tools/registry";
import { ActionPolicyEngine } from "../policy/action-policy";
import { ActionLifecycleManager } from "./action-lifecycle";
import { ApprovalManager } from "./approval-manager";
import { SessionContextBuilder } from "../context/session-context";
import { BASE_AI_SYSTEM_PROMPT } from "../prompts/system-prompt";
import { ActionVerificationRunner } from "./verification";
import { RiskPolicyClassifier } from "../policy/risk-policy";

export interface PipelineExecutionOptions {
  sessionId: string;
  deviceId: string;
  userId: string;
  userPrompt: string;
  automationMode?: AiAutomationMode;
  grantedPermissions?: string[];
  diagnostics?: AiDiagnosticSnapshot;
  screenshotBase64?: string;
  preferredProvider?: AiProviderName;
  conversation?: AiConversation;
  existingMessages?: AiMessage[];
}

export interface PipelineExecutionResult {
  response: AIResponse;
  proposals: AiActionProposal[];
  executedActions: Array<{
    actionId: string;
    tool: string;
    result: AiToolResult;
    verified: boolean;
  }>;
  conversationMessages: AiMessage[];
}

export class AIRequestPipeline {
  private router: AIProviderRouter;
  private registry: ToolRegistry;
  private lifecycle: ActionLifecycleManager;
  private approvalManager: ApprovalManager;
  private contextBuilder: SessionContextBuilder;
  private maxToolSteps = 8;

  constructor(params: {
    router: AIProviderRouter;
    registry: ToolRegistry;
    lifecycle: ActionLifecycleManager;
    approvalManager: ApprovalManager;
  }) {
    this.router = params.router;
    this.registry = params.registry;
    this.lifecycle = params.lifecycle;
    this.approvalManager = params.approvalManager;
    this.contextBuilder = new SessionContextBuilder();
  }

  public async run(options: PipelineExecutionOptions): Promise<PipelineExecutionResult> {
    const requestId = `req_${options.sessionId}_${Date.now()}`;
    const automationMode = options.automationMode || "ASK_BEFORE_ACTION";
    const grantedPermissions = options.grantedPermissions || ["SYSTEM_INFO"];

    const policyContext: AiPolicyContext = {
      userId: options.userId,
      deviceId: options.deviceId,
      sessionId: options.sessionId,
      permissions: grantedPermissions,
      automationMode,
    };

    // 1. Prepare conversation messages
    const messages: AiMessage[] = [...(options.existingMessages || [])];
    const userMessage: AiMessage = {
      messageId: `msg_${Date.now()}_u`,
      conversationId: options.conversation?.conversationId || `conv_${options.sessionId}`,
      role: "user",
      content: options.userPrompt,
      timestamp: Date.now(),
    };
    messages.push(userMessage);

    // 2. Assemble context with redaction and boundaries
    const assembled = this.contextBuilder.buildContext({
      baseSystemPrompt: BASE_AI_SYSTEM_PROMPT,
      sessionInfo: {
        sessionId: options.sessionId,
        initiatorDeviceId: options.deviceId,
        targetDeviceId: options.deviceId,
        grantedPermissions,
        createdAt: Date.now(),
      },
      diagnostics: options.diagnostics,
      conversationMessages: messages,
    });

    const proposals: AiActionProposal[] = [];
    const executedActions: Array<{
      actionId: string;
      tool: string;
      result: AiToolResult;
      verified: boolean;
    }> = [];

    let currentStep = 0;
    let finalResponse: AIResponse | null = null;

    // 3. Multi-step tool execution loop (up to maxToolSteps)
    while (currentStep < this.maxToolSteps) {
      currentStep++;

      const toolDefs = this.registry.listToolDefinitions();
      const visionImages = options.screenshotBase64
        ? [{ base64: options.screenshotBase64, mimeType: "image/jpeg" }]
        : undefined;

      const aiRequest: AIRequest = {
        requestId,
        sessionId: options.sessionId,
        conversationId: options.conversation?.conversationId,
        systemPrompt: assembled.systemPrompt,
        messages,
        tools: toolDefs,
        visionImages,
      };

      const response = await this.router.execute(aiRequest, options.preferredProvider);
      finalResponse = response;

      // If no tool calls returned by AI, break loop and return answer
      if (!response.toolCalls || response.toolCalls.length === 0) {
        messages.push({
          messageId: `msg_${Date.now()}_a`,
          conversationId: options.conversation?.conversationId || `conv_${options.sessionId}`,
          role: "assistant",
          content: response.content,
          timestamp: Date.now(),
          responseType: "ANSWER",
        });
        break;
      }

      // Record assistant message with tool calls
      messages.push({
        messageId: `msg_${Date.now()}_a`,
        conversationId: options.conversation?.conversationId || `conv_${options.sessionId}`,
        role: "assistant",
        content: response.content,
        toolCalls: response.toolCalls,
        timestamp: Date.now(),
        responseType: "ACTION_PROPOSAL",
      });

      // 4. Process each proposed tool call
      for (const call of response.toolCalls) {
        const risk = RiskPolicyClassifier.classifyToolRisk(call.name);

        const proposal = this.lifecycle.createProposal({
          sessionId: options.sessionId,
          deviceId: options.deviceId,
          userId: options.userId,
          aiRequestId: requestId,
          tool: call.name,
          arguments: call.arguments,
          reason: response.content || `Execute tool ${call.name}`,
          risk,
          requiresApproval: risk !== "READ_ONLY" && automationMode !== "LIMITED_AUTO",
          expectedResult: `Executed ${call.name}`,
        });

        const policyDecision = ActionPolicyEngine.evaluateAction(proposal, policyContext);

        if (policyDecision === "DENY") {
          this.lifecycle.transitionStatus(proposal.proposalId, "REJECTED");
          messages.push({
            messageId: `msg_${Date.now()}_t`,
            conversationId: options.conversation?.conversationId || `conv_${options.sessionId}`,
            role: "tool_result",
            toolResultId: call.toolCallId,
            content: `Tool "${call.name}" was blocked by policy: DENIED.`,
            timestamp: Date.now(),
            responseType: "WARNING",
          });
          continue;
        }

        if (policyDecision === "REQUIRE_APPROVAL") {
          proposals.push(proposal);
          // Tool execution paused pending human approval
          messages.push({
            messageId: `msg_${Date.now()}_t`,
            conversationId: options.conversation?.conversationId || `conv_${options.sessionId}`,
            role: "tool_result",
            toolResultId: call.toolCallId,
            content: `Action proposal created for "${call.name}". Awaiting human approval.`,
            timestamp: Date.now(),
            responseType: "ACTION_PROPOSAL",
          });
          // Stop tool loop to let user review proposal
          return {
            response,
            proposals,
            executedActions,
            conversationMessages: messages,
          };
        }

        // 5. If ALLOW: execute tool immediately
        this.lifecycle.transitionStatus(proposal.proposalId, "EXECUTING");
        const toolResult = await this.registry.executeTool(
          call.name,
          call.arguments,
          { sessionId: options.sessionId, deviceId: options.deviceId, userId: options.userId },
          call.toolCallId,
        );

        this.lifecycle.transitionStatus(proposal.proposalId, "VERIFYING");
        const verification = await ActionVerificationRunner.verifyResult(
          call.name,
          toolResult,
          proposal.expectedResult,
        );

        const finalStatus = verification.verified ? "VERIFIED" : "FAILED";
        this.lifecycle.transitionStatus(proposal.proposalId, finalStatus);

        executedActions.push({
          actionId: proposal.proposalId,
          tool: call.name,
          result: toolResult,
          verified: verification.verified,
        });

        messages.push({
          messageId: `msg_${Date.now()}_t`,
          conversationId: options.conversation?.conversationId || `conv_${options.sessionId}`,
          role: "tool_result",
          toolResultId: call.toolCallId,
          content: JSON.stringify(toolResult.result),
          timestamp: Date.now(),
          responseType: "ACTION_RESULT",
        });

        // If action failed verification, stop tool loop to avoid compounding errors
        if (!verification.verified) {
          break;
        }
      }
    }

    return {
      response: finalResponse || {
        requestId,
        provider: options.preferredProvider || "google",
        model: "default",
        content: "Completed diagnostic analysis.",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        latencyMs: 0,
        finishReason: "stop",
      },
      proposals,
      executedActions,
      conversationMessages: messages,
    };
  }
}
