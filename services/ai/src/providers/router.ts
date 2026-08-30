import {
  AiProviderName,
  AIRequest,
  AIResponse,
  AiUsageRecord,
  ProviderCapabilities,
} from "@nexusdesk/types";
import { AIProvider } from "./provider.interface";

export interface ProviderRouterConfig {
  defaultProvider: AiProviderName;
  fallbackEnabled: boolean;
  requestTimeoutMs: number;
  maxRetries: number;
  onUsageRecorded?: (usage: AiUsageRecord) => void;
}

export class AIProviderRouter {
  private providers = new Map<AiProviderName, AIProvider>();
  private defaultProviderName: AiProviderName;
  private fallbackEnabled: boolean;
  private requestTimeoutMs: number;
  private maxRetries: number;
  private onUsageRecorded?: (usage: AiUsageRecord) => void;

  constructor(config: Partial<ProviderRouterConfig> = {}) {
    this.defaultProviderName = config.defaultProvider || "google";
    this.fallbackEnabled = config.fallbackEnabled ?? true;
    this.requestTimeoutMs = config.requestTimeoutMs ?? 30000;
    this.maxRetries = config.maxRetries ?? 2;
    this.onUsageRecorded = config.onUsageRecorded;
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name: AiProviderName): AIProvider | undefined {
    return this.providers.get(name);
  }

  public listProviders(): AiProviderName[] {
    return Array.from(this.providers.keys());
  }

  public async getAvailableProviders(): Promise<
    Array<{ name: AiProviderName; available: boolean; model: string }>
  > {
    const results: Array<{ name: AiProviderName; available: boolean; model: string }> = [];
    for (const [name, provider] of this.providers.entries()) {
      try {
        const health = await provider.healthCheck();
        results.push({ name, available: health.available, model: health.model });
      } catch {
        results.push({ name, available: false, model: "unknown" });
      }
    }
    return results;
  }

  public selectProvider(
    preferred?: AiProviderName,
    requiredCapabilities?: Partial<ProviderCapabilities>,
  ): AIProvider {
    // 1. Try preferred provider if specified and matching capabilities
    if (preferred && this.providers.has(preferred)) {
      const p = this.providers.get(preferred)!;
      if (this.matchesCapabilities(p, requiredCapabilities)) {
        return p;
      }
    }

    // 2. Try default provider
    if (this.providers.has(this.defaultProviderName)) {
      const p = this.providers.get(this.defaultProviderName)!;
      if (this.matchesCapabilities(p, requiredCapabilities)) {
        return p;
      }
    }

    // 3. Try any available provider that matches capabilities
    for (const provider of this.providers.values()) {
      if (this.matchesCapabilities(provider, requiredCapabilities)) {
        return provider;
      }
    }

    // 4. Fallback to any registered provider
    const anyProvider = this.providers.values().next().value;
    if (!anyProvider) {
      throw new Error("No AI providers registered in AIProviderRouter");
    }
    return anyProvider;
  }

  public async execute(
    request: AIRequest,
    preferredProvider?: AiProviderName,
  ): Promise<AIResponse> {
    const requiredCaps: Partial<ProviderCapabilities> = {};
    if (request.visionImages && request.visionImages.length > 0) {
      requiredCaps.vision = true;
    }
    if (request.tools && request.tools.length > 0) {
      requiredCaps.tools = true;
    }

    const providerList = this.getFallbackChain(preferredProvider, requiredCaps);

    let lastError: Error | null = null;

    for (const provider of providerList) {
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          const response = await this.executeWithTimeout(provider, request);

          // Record usage metrics
          if (this.onUsageRecorded) {
            const cost = this.estimateCost(
              provider.name,
              response.usage.inputTokens,
              response.usage.outputTokens,
            );
            this.onUsageRecorded({
              requestId: request.requestId,
              sessionId: request.sessionId,
              userId: request.conversationId || "system",
              provider: provider.name,
              model: response.model,
              inputTokens: response.usage.inputTokens,
              outputTokens: response.usage.outputTokens,
              visionUnits: request.visionImages?.length,
              estimatedCost: cost,
              durationMs: response.latencyMs,
              createdAt: Date.now(),
            });
          }

          return response;
        } catch (err: any) {
          lastError = err;
          // Only retry if it's transient error and attempts remain
          if (attempt < this.maxRetries && this.isTransientError(err)) {
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
            continue;
          }
          break; // break retry loop to try fallback provider
        }
      }

      if (!this.fallbackEnabled) {
        break;
      }
    }

    throw lastError || new Error("Failed to execute AI request with any available provider");
  }

  private matchesCapabilities(
    provider: AIProvider,
    required?: Partial<ProviderCapabilities>,
  ): boolean {
    if (!required) return true;
    if (required.vision && !provider.supportsVision()) return false;
    if (required.tools && !provider.supportsTools()) return false;
    if (required.streaming && !provider.supportsStreaming()) return false;
    return true;
  }

  private getFallbackChain(
    preferred?: AiProviderName,
    requiredCaps?: Partial<ProviderCapabilities>,
  ): AIProvider[] {
    const chain: AIProvider[] = [];
    const added = new Set<AiProviderName>();

    if (preferred && this.providers.has(preferred)) {
      const p = this.providers.get(preferred)!;
      if (this.matchesCapabilities(p, requiredCaps)) {
        chain.push(p);
        added.add(p.name);
      }
    }

    if (this.providers.has(this.defaultProviderName) && !added.has(this.defaultProviderName)) {
      const p = this.providers.get(this.defaultProviderName)!;
      if (this.matchesCapabilities(p, requiredCaps)) {
        chain.push(p);
        added.add(p.name);
      }
    }

    if (this.fallbackEnabled) {
      for (const provider of this.providers.values()) {
        if (!added.has(provider.name) && this.matchesCapabilities(provider, requiredCaps)) {
          chain.push(provider);
          added.add(provider.name);
        }
      }
    }

    return chain.length > 0 ? chain : [this.selectProvider(preferred, requiredCaps)];
  }

  private async executeWithTimeout(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    return Promise.race([
      provider.generate(request),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`AI Request timed out after ${this.requestTimeoutMs}ms`)),
          this.requestTimeoutMs,
        ),
      ),
    ]);
  }

  private isTransientError(error: any): boolean {
    const msg = error?.message?.toLowerCase() || "";
    return (
      msg.includes("timeout") ||
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("econnreset") ||
      msg.includes("503") ||
      msg.includes("overloaded")
    );
  }

  private estimateCost(
    provider: AiProviderName,
    inputTokens: number,
    outputTokens: number,
  ): number {
    // Rough per-million token pricing estimates
    const rates: Record<AiProviderName, { input: number; output: number }> = {
      google: { input: 0.1, output: 0.4 }, // Gemini 2.0 Flash
      openai: { input: 2.5, output: 10.0 }, // GPT-4o
      anthropic: { input: 3.0, output: 15.0 }, // Claude 3.5 Sonnet
      openrouter: { input: 2.0, output: 8.0 },
      ollama: { input: 0.0, output: 0.0 }, // Local free
    };

    const rate = rates[provider] ?? { input: 0.1, output: 0.4 };
    return (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
  }
}
