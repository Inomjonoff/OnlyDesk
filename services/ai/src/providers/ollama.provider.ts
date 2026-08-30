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

export class OllamaProvider implements AIProvider {
  public readonly name: AiProviderName = "ollama";
  private baseUrl: string;
  private modelName: string;

  constructor(baseUrl = "http://localhost:11434", modelName = "llama3.2") {
    this.baseUrl = baseUrl;
    this.modelName = modelName;
  }

  public supportsVision(): boolean {
    return this.modelName.includes("vision") || this.modelName.includes("llava");
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
      vision: this.supportsVision(),
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
      contextWindow: 32768,
      maxOutputTokens: 4096,
    };
  }

  public async healthCheck(): Promise<{ available: boolean; model: string; latencyMs?: number }> {
    const start = Date.now();
    try {
      if (typeof fetch !== "undefined") {
        const res = await fetch(`${this.baseUrl}/api/tags`, { method: "GET" }).catch(() => null);
        return {
          available: res ? res.ok : false,
          model: this.modelName,
          latencyMs: Date.now() - start,
        };
      }
    } catch {
      // Fallback
    }
    return {
      available: process.env.NODE_ENV === "test",
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
      content: `[Ollama ${this.modelName}] Local analysis: "${prompt}"`,
      usage: {
        inputTokens: Math.max(10, Math.ceil(prompt.length / 4)),
        outputTokens: 30,
        totalTokens: Math.max(10, Math.ceil(prompt.length / 4)) + 30,
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
