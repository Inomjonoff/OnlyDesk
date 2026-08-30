import { ToolRegistry } from "./registry";
import { AiControlLease, AiComputerUseStep } from "@nexusdesk/types";

export interface ComputerUseExecutor {
  executeStep(step: AiComputerUseStep): Promise<{ success: boolean; details?: string }>;
  isEmergencyStopped(): boolean;
  isSensitiveUIPresent(screenshotBase64?: string): Promise<boolean>;
}

export class ComputerUseTool {
  private activeLeases = new Map<string, AiControlLease>();
  private executor?: ComputerUseExecutor;

  constructor(executor?: ComputerUseExecutor) {
    this.executor = executor;
  }

  public setExecutor(executor: ComputerUseExecutor): void {
    this.executor = executor;
  }

  public createLease(
    sessionId: string,
    deviceId: string,
    proposalId: string,
    maxSteps = 5,
  ): AiControlLease {
    const lease: AiControlLease = {
      leaseId: `lease_${sessionId}_${Date.now()}`,
      sessionId,
      deviceId,
      proposalId,
      stepsRemaining: Math.min(maxSteps, 5),
      maxSteps: Math.min(maxSteps, 5),
      createdAt: Date.now(),
      expiresAt: Date.now() + 30000, // 30s max lease
    };
    this.activeLeases.set(lease.leaseId, lease);
    return lease;
  }

  public getLease(leaseId: string): AiControlLease | undefined {
    const lease = this.activeLeases.get(leaseId);
    if (lease && Date.now() > lease.expiresAt) {
      this.activeLeases.delete(leaseId);
      return undefined;
    }
    return lease;
  }

  public registerTools(registry: ToolRegistry): void {
    // 1. ai_click
    registry.registerTool(
      {
        name: "ai_click",
        description:
          "Click a normalized screen coordinate (0.0 to 1.0) as part of an approved automation lease",
        inputSchema: {
          type: "object",
          properties: {
            leaseId: { type: "string" },
            x: { type: "number", minimum: 0, maximum: 1 },
            y: { type: "number", minimum: 0, maximum: 1 },
            button: { type: "string", enum: ["LEFT", "RIGHT", "DOUBLE_CLICK"], default: "LEFT" },
          },
          required: ["leaseId", "x", "y"],
        },
        riskLevel: "MEDIUM",
        requiredPermission: "AI_COMPUTER_USE",
        timeout: 5000,
        toolVersion: "1.0.0",
      },
      async (args, _ctx) => {
        const lease = this.getLease(String(args.leaseId || ""));
        if (!lease || lease.stepsRemaining <= 0) {
          throw new Error("Invalid or expired AI control lease. Re-approval required.");
        }

        if (this.executor?.isEmergencyStopped()) {
          throw new Error("AI actions paused: Emergency stop active.");
        }

        const x = Number(args.x);
        const y = Number(args.y);
        if (isNaN(x) || isNaN(y) || x < 0 || x > 1 || y < 0 || y > 1) {
          throw new Error("Coordinates must be normalized numbers between 0.0 and 1.0");
        }

        lease.stepsRemaining--;

        if (this.executor) {
          const res = await this.executor.executeStep({
            action: "click",
            x,
            y,
          });
          return {
            action: "click",
            x,
            y,
            stepsRemaining: lease.stepsRemaining,
            success: res.success,
          };
        }

        return { action: "click", x, y, stepsRemaining: lease.stepsRemaining, success: true };
      },
    );

    // 2. ai_type
    registry.registerTool(
      {
        name: "ai_type",
        description:
          "Type text into currently focused element (disallowed in password/sensitive inputs)",
        inputSchema: {
          type: "object",
          properties: {
            leaseId: { type: "string" },
            text: { type: "string", maxLength: 200 },
          },
          required: ["leaseId", "text"],
        },
        riskLevel: "MEDIUM",
        requiredPermission: "AI_COMPUTER_USE",
        timeout: 5000,
        toolVersion: "1.0.0",
      },
      async (args, _ctx) => {
        const lease = this.getLease(String(args.leaseId || ""));
        if (!lease || lease.stepsRemaining <= 0) {
          throw new Error("Invalid or expired AI control lease. Re-approval required.");
        }

        if (this.executor?.isEmergencyStopped()) {
          throw new Error("AI actions paused: Emergency stop active.");
        }

        const text = String(args.text || "");
        // Block typing suspected passwords
        if (/password|passwd|secret|cvv|ssn/i.test(text)) {
          throw new Error("AI is blocked from entering passwords or security credentials.");
        }

        lease.stepsRemaining--;

        if (this.executor) {
          const res = await this.executor.executeStep({
            action: "type",
            value: text,
          });
          return {
            action: "type",
            length: text.length,
            stepsRemaining: lease.stepsRemaining,
            success: res.success,
          };
        }

        return {
          action: "type",
          length: text.length,
          stepsRemaining: lease.stepsRemaining,
          success: true,
        };
      },
    );

    // 3. ai_scroll
    registry.registerTool(
      {
        name: "ai_scroll",
        description: "Scroll viewport vertically or horizontally",
        inputSchema: {
          type: "object",
          properties: {
            leaseId: { type: "string" },
            deltaY: { type: "number" },
            deltaX: { type: "number", default: 0 },
          },
          required: ["leaseId", "deltaY"],
        },
        riskLevel: "LOW",
        requiredPermission: "AI_COMPUTER_USE",
        timeout: 5000,
        toolVersion: "1.0.0",
      },
      async (args, _ctx) => {
        const lease = this.getLease(String(args.leaseId || ""));
        if (!lease || lease.stepsRemaining <= 0) {
          throw new Error("Invalid or expired AI control lease.");
        }

        lease.stepsRemaining--;
        return {
          action: "scroll",
          deltaY: args.deltaY,
          stepsRemaining: lease.stepsRemaining,
          success: true,
        };
      },
    );
  }
}
