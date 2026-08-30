import { AiToolDefinition, AiToolResult, AiRiskLevel } from "@nexusdesk/types";

export type ToolHandler = (
  args: Record<string, unknown>,
  context: { sessionId: string; deviceId: string; userId: string },
) => Promise<Record<string, unknown>>;

export type ToolVerifier = (
  beforeState: Record<string, unknown> | undefined,
  afterState: Record<string, unknown> | undefined,
  args: Record<string, unknown>,
) => Promise<{ verified: boolean; details?: string }>;

export interface RegisteredTool {
  definition: AiToolDefinition;
  handler: ToolHandler;
  verifier?: ToolVerifier;
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();
  private executionHistory: Array<{ tool: string; argsHash: string; timestamp: number }> = [];

  public registerTool(
    definition: AiToolDefinition,
    handler: ToolHandler,
    verifier?: ToolVerifier,
  ): void {
    this.tools.set(definition.name, { definition, handler, verifier });
  }

  public getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  public listToolDefinitions(): AiToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  public getToolRisk(name: string): AiRiskLevel {
    const tool = this.tools.get(name);
    return tool ? tool.definition.riskLevel : "CRITICAL";
  }

  public async executeTool(
    name: string,
    args: Record<string, unknown>,
    context: { sessionId: string; deviceId: string; userId: string },
    toolCallId = `call_${Date.now()}`,
  ): Promise<AiToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        toolCallId,
        name,
        success: false,
        result: {},
        error: `Tool "${name}" is not registered in the allowable tool registry`,
        durationMs: 0,
      };
    }

    // Tool loop detection: check if same tool with identical args was called in last 3 seconds
    const argsHash = JSON.stringify(args);
    const now = Date.now();
    const isLoop = this.executionHistory.some(
      (h) => h.tool === name && h.argsHash === argsHash && now - h.timestamp < 3000,
    );

    if (isLoop) {
      return {
        toolCallId,
        name,
        success: false,
        result: {},
        error: `Tool loop detected: "${name}" was repeatedly invoked with identical arguments`,
        durationMs: 0,
      };
    }

    this.executionHistory.push({ tool: name, argsHash, timestamp: now });
    if (this.executionHistory.length > 50) {
      this.executionHistory.shift();
    }

    const start = Date.now();
    try {
      // Execute with timeout
      const resultPromise = tool.handler(args, context);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Tool execution timed out after ${tool.definition.timeout}ms`)),
          tool.definition.timeout,
        ),
      );

      const rawResult = await Promise.race([resultPromise, timeoutPromise]);
      const durationMs = Date.now() - start;

      let verificationResult: { verified: boolean; details?: string } | undefined;
      if (tool.verifier) {
        try {
          verificationResult = await tool.verifier(undefined, rawResult, args);
        } catch (err: any) {
          verificationResult = { verified: false, details: `Verification error: ${err.message}` };
        }
      }

      return {
        toolCallId,
        name,
        success: verificationResult ? verificationResult.verified : true,
        result: rawResult,
        durationMs,
        verification: verificationResult,
      };
    } catch (err: any) {
      return {
        toolCallId,
        name,
        success: false,
        result: {},
        error: err.message || "Unknown error during tool execution",
        durationMs: Date.now() - start,
      };
    }
  }
}
