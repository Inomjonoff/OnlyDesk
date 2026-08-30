import {
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AiProviderName,
  ModelMetadata,
  ProviderCapabilities,
  AiToolCall,
} from "@nexusdesk/types";
import { AIProvider } from "./provider.interface";

export interface MockProviderOptions {
  name?: AiProviderName;
  model?: string;
  capabilities?: Partial<ProviderCapabilities>;
  responseGenerator?: (request: AIRequest) => Partial<AIResponse>;
  latencyMs?: number;
  available?: boolean;
}

export class MockAIProvider implements AIProvider {
  public readonly name: AiProviderName;
  private readonly model: string;
  private readonly capabilities: ProviderCapabilities;
  private readonly responseGenerator?: (request: AIRequest) => Partial<AIResponse>;
  private readonly latency: number;
  private available: boolean;

  constructor(options: MockProviderOptions = {}) {
    this.name = options.name || "google";
    this.model = options.model || "mock-model-v1";
    this.capabilities = {
      text: true,
      vision: true,
      tools: true,
      structuredOutput: true,
      streaming: true,
      ...options.capabilities,
    };
    this.responseGenerator = options.responseGenerator;
    this.latency = options.latencyMs ?? 5;
    this.available = options.available ?? true;
  }

  public supportsVision(): boolean {
    return this.capabilities.vision;
  }

  public supportsTools(): boolean {
    return this.capabilities.tools;
  }

  public supportsStreaming(): boolean {
    return this.capabilities.streaming;
  }

  public getModelMetadata(): ModelMetadata {
    return {
      provider: this.name,
      model: this.model,
      capabilities: this.capabilities,
      contextWindow: 128000,
      maxOutputTokens: 8192,
    };
  }

  public getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }

  public setAvailable(available: boolean): void {
    this.available = available;
  }

  public async healthCheck(): Promise<{ available: boolean; model: string; latencyMs?: number }> {
    return {
      available: this.available,
      model: this.model,
      latencyMs: this.latency,
    };
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    if (!this.available) {
      throw new Error(`Provider ${this.name} is currently unavailable`);
    }

    if (this.latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latency));
    }

    if (this.responseGenerator) {
      const custom = this.responseGenerator(request);
      return {
        requestId: request.requestId,
        provider: this.name,
        model: this.model,
        content: custom.content ?? "Default mock response",
        toolCalls: custom.toolCalls,
        usage: custom.usage ?? { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        latencyMs: this.latency,
        finishReason: custom.finishReason ?? (custom.toolCalls ? "tool_calls" : "stop"),
      };
    }

    // Default intelligent mock response: if tools provided and user asks for diagnostics or actions
    const lastUserMsg = request.messages.filter((m) => m.role === "user").pop();
    const prompt = lastUserMsg?.content.toLowerCase() || "";

    let toolCalls: AiToolCall[] | undefined;
    let content = "Diagnostic observation complete.";

    if (request.tools && request.tools.length > 0) {
      if (prompt.includes("slow") || prompt.includes("diagnose") || prompt.includes("cpu")) {
        const diagTool = request.tools.find(
          (t) => t.name === "get_cpu_usage" || t.name === "get_top_processes",
        );
        if (diagTool) {
          toolCalls = [
            {
              toolCallId: `call_${Date.now()}_1`,
              name: diagTool.name,
              arguments: { limit: 5 },
            },
          ];
          content = "I will inspect the top processes to diagnose CPU utilization.";
        }
      } else if (prompt.includes("restart")) {
        const appTool = request.tools.find((t) => t.name === "restart_supported_application");
        if (appTool) {
          toolCalls = [
            {
              toolCallId: `call_${Date.now()}_2`,
              name: "restart_supported_application",
              arguments: { applicationId: "app_chrome", reason: "High memory utilization" },
            },
          ];
          content = "I propose restarting Google Chrome to free allocated memory.";
        }
      }
    }

    return {
      requestId: request.requestId,
      provider: this.name,
      model: this.model,
      content,
      toolCalls,
      usage: {
        inputTokens: 100,
        outputTokens: 40,
        totalTokens: 140,
      },
      latencyMs: this.latency,
      finishReason: toolCalls ? "tool_calls" : "stop",
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

    if (full.toolCalls && full.toolCalls.length > 0) {
      for (const call of full.toolCalls) {
        yield {
          requestId: request.requestId,
          delta: "",
          toolCall: call,
          done: false,
        };
      }
    }

    yield {
      requestId: request.requestId,
      delta: "",
      done: true,
    };
  }
}
