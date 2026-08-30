import {
  AiProviderName,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ModelMetadata,
  ProviderCapabilities,
} from "@nexusdesk/types";

export interface AIProvider {
  readonly name: AiProviderName;
  generate(request: AIRequest): Promise<AIResponse>;
  generateStream?(request: AIRequest): AsyncGenerator<AIStreamChunk>;
  supportsVision(): boolean;
  supportsTools(): boolean;
  supportsStreaming(): boolean;
  getModelMetadata(): ModelMetadata;
  getCapabilities(): ProviderCapabilities;
  healthCheck(): Promise<{ available: boolean; model: string; latencyMs?: number }>;
}
