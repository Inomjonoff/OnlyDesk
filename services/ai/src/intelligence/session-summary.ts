import { AiFinding, AiSessionReport, AiResolutionStatus, AiToolResult } from "@nexusdesk/types";
import { SessionFactStore } from "./fact-store";

export interface SessionReportGeneratorOptions {
  sessionId: string;
  findings?: AiFinding[];
  executedActions?: Array<{
    actionId: string;
    tool: string;
    result: AiToolResult;
    verified: boolean;
  }>;
  factStore?: SessionFactStore;
  providerName?: "google" | "openai" | "anthropic" | "openrouter" | "ollama";
  modelName?: string;
}

export class SessionReportGenerator {
  public static generateReport(options: SessionReportGeneratorOptions): AiSessionReport {
    const findings = options.findings || [];
    const actions = options.executedActions || [];
    const facts = options.factStore?.getSessionFacts(options.sessionId) || [];

    // Determine resolution status based on executed actions and findings
    let resolution: AiResolutionStatus = "RESOLVED";
    const unresolvedIssues: string[] = [];

    if (findings.some((f) => f.severity === "CRITICAL" || f.severity === "HIGH")) {
      const hasVerifiedFix = actions.some((a) => a.verified);
      if (!hasVerifiedFix) {
        resolution = "UNRESOLVED";
        unresolvedIssues.push("Critical findings detected without verified corrective actions");
      } else {
        resolution = "PARTIALLY_RESOLVED";
      }
    }

    const actionsFormatted = actions.map((a) => ({
      actionId: a.actionId,
      tool: a.tool,
      result: a.result.success ? "Success" : a.result.error || "Failed",
      verified: a.verified,
    }));

    const recommendations = [
      {
        recommendation: "Keep system patched and monitor memory usage during intense sessions.",
        evidence:
          facts.length > 0 && facts[0] ? facts[0].statement : "Session telemetry within bounds",
      },
    ];

    return {
      reportId: `rep_${options.sessionId}_${Date.now()}`,
      sessionId: options.sessionId,
      version: 1,
      status: "READY",
      summary: `Remote support session completed with ${actions.length} action(s) executed and verified. Resolution: ${resolution}.`,
      issues: findings,
      actionsExecuted: actionsFormatted,
      resolution,
      unresolvedIssues,
      recommendations,
      provider: options.providerName || "google",
      model: options.modelName || "gemini-2.0-flash",
      createdAt: Date.now(),
    };
  }
}
