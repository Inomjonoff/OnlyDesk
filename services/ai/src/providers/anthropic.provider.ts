import {
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AiMessage,
  AiProviderName,
  ModelMetadata,
  ProviderCapabilities,
} from "@nexusdesk/types";
import { AIProvider } from "./provider.interface";

export class AnthropicProvider implements AIProvider {
  public readonly name: AiProviderName = "anthropic";
  private apiKey?: string;
  private modelName: string;

  constructor(apiKey?: string, modelName = "claude-3-7-sonnet") {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  public supportsVision(): boolean {
    return true;
  }

  public supportsTools(): boolean {
    return true;
  }

  public supportsStreaming(): boolean {
    return true;
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      text: true,
      vision: true,
      tools: true,
      structuredOutput: true,
      streaming: true,
    };
  }

  public getModelMetadata(): ModelMetadata {
    return {
      provider: this.name,
      model: this.modelName,
      capabilities: this.getCapabilities(),
      contextWindow: 200000,
      maxOutputTokens: 8192,
    };
  }

  public async healthCheck(): Promise<{ available: boolean; model: string; latencyMs?: number }> {
    const start = Date.now();
    return {
      available: Boolean(this.apiKey) || process.env.NODE_ENV === "test",
      model: this.modelName,
      latencyMs: Date.now() - start,
    };
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const lastUserMsg = request.messages.filter((m: AiMessage) => m.role === "user").pop();
    const prompt = lastUserMsg?.content || "";

    const latencyMs = Date.now() - start;
    return {
      requestId: request.requestId,
      provider: this.name,
      model: this.modelName,
      content: `[Anthropic ${this.modelName}] Analysis for query: "${prompt}"`,
      usage: {
        inputTokens: Math.max(10, Math.ceil(prompt.length / 4)),
        outputTokens: 40,
        totalTokens: Math.max(10, Math.ceil(prompt.length / 4)) + 40,
      },
      latencyMs,
      finishReason: "stop",
    };
  }

  public async *generateStream(request: AIRequest): AsyncGenerator<AIStreamChunk> {
    const full = await this.generate(request);
    const words = full.content.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield {
        requestId: request.requestId,
        delta: (i > 0 ? " " : "") + words[i],
        done: false,
      };
    }
    yield {
      requestId: request.requestId,
      delta: "",
      done: true,
    };
  }
}
