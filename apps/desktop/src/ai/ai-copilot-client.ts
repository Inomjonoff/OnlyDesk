import {
  AiActionProposal,
  AiConversation,
  AiMessage,
  AIResponse,
  AiToolResult,
} from "@nexusdesk/types";

export interface AICopilotClientConfig {
  aiBaseUrl?: string;
  sessionId: string;
  onProposalReceived?: (proposal: AiActionProposal) => void;
  onMessageReceived?: (message: AiMessage) => void;
  onActionExecuted?: (action: {
    actionId: string;
    tool: string;
    result: AiToolResult;
    verified: boolean;
  }) => void;
}

export class AICopilotClient {
  private aiBaseUrl: string;
  private sessionId: string;
  private conversation?: AiConversation;
  private messages: AiMessage[] = [];
  private onProposalReceived?: (proposal: AiActionProposal) => void;
  private onMessageReceived?: (message: AiMessage) => void;
  private onActionExecuted?: (action: {
    actionId: string;
    tool: string;
    result: AiToolResult;
    verified: boolean;
  }) => void;

  constructor(config: AICopilotClientConfig) {
    this.aiBaseUrl = config.aiBaseUrl || "http://localhost:4002";
    this.sessionId = config.sessionId;
    this.onProposalReceived = config.onProposalReceived;
    this.onMessageReceived = config.onMessageReceived;
    this.onActionExecuted = config.onActionExecuted;
  }

  public async initialize(): Promise<AiConversation> {
    try {
      const res = await fetch(`${this.aiBaseUrl}/api/v1/ai/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: this.sessionId }),
      });
      if (res.ok) {
        const data = await res.json();
        this.conversation = data.conversation;
        return this.conversation!;
      }
    } catch {
      // Fallback local conversation
    }

    this.conversation = {
      conversationId: `conv_${this.sessionId}`,
      sessionId: this.sessionId,
      userId: "local_user",
      state: "ACTIVE",
      provider: "google",
      model: "gemini-2.0-flash",
      messageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return this.conversation;
  }

  public async sendMessage(
    content: string,
    screenshotBase64?: string,
  ): Promise<{ response: AIResponse; proposals: AiActionProposal[] }> {
    if (!this.conversation) {
      await this.initialize();
    }

    const res = await fetch(
      `${this.aiBaseUrl}/api/v1/ai/conversations/${this.conversation!.conversationId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          screenshotBase64,
          includeDiagnostics: true,
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`AI request failed with status ${res.status}`);
    }

    const data = await res.json();
    this.messages = data.messages || [];

    if (this.onMessageReceived && this.messages.length > 0) {
      for (const msg of this.messages) {
        this.onMessageReceived(msg);
      }
    }

    if (data.proposals && data.proposals.length > 0 && this.onProposalReceived) {
      for (const p of data.proposals) {
        this.onProposalReceived(p);
      }
    }

    if (data.executedActions && this.onActionExecuted) {
      for (const a of data.executedActions) {
        this.onActionExecuted(a);
      }
    }

    return {
      response: data.response,
      proposals: data.proposals || [],
    };
  }

  public async approveAction(proposalId: string): Promise<boolean> {
    const res = await fetch(`${this.aiBaseUrl}/api/v1/ai/action-proposals/${proposalId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return res.ok;
  }

  public async rejectAction(proposalId: string, reason?: string): Promise<boolean> {
    const res = await fetch(`${this.aiBaseUrl}/api/v1/ai/action-proposals/${proposalId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    return res.ok;
  }

  public getMessages(): AiMessage[] {
    return this.messages;
  }
}
