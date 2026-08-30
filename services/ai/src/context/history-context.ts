import { AiMessage } from "@nexusdesk/types";

export interface ConversationSummary {
  summaryText: string;
  retainedMessages: AiMessage[];
  totalOriginalMessages: number;
}

export class HistoryContextCompressor {
  private maxRetainedRecentMessages: number;

  constructor(maxRetainedRecentMessages = 6) {
    this.maxRetainedRecentMessages = maxRetainedRecentMessages;
  }

  public compressHistory(messages: AiMessage[]): ConversationSummary {
    if (messages.length <= this.maxRetainedRecentMessages) {
      return {
        summaryText: "",
        retainedMessages: messages,
        totalOriginalMessages: messages.length,
      };
    }

    const olderMessages = messages.slice(0, messages.length - this.maxRetainedRecentMessages);
    const retainedMessages = messages.slice(messages.length - this.maxRetainedRecentMessages);

    // Build structured bullet summary of earlier messages
    const summaryLines: string[] = [];
    for (const msg of olderMessages) {
      if (msg.role === "user") {
        summaryLines.push(`- User asked: "${msg.content.slice(0, 100)}"`);
      } else if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
        summaryLines.push(`- AI ran tools: ${msg.toolCalls.map((c) => c.name).join(", ")}`);
      } else if (msg.role === "assistant") {
        summaryLines.push(`- AI noted: "${msg.content.slice(0, 100)}"`);
      }
    }

    return {
      summaryText: `Earlier conversation points:\n${summaryLines.join("\n")}`,
      retainedMessages,
      totalOriginalMessages: messages.length,
    };
  }
}
