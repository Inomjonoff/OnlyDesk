import { describe, it, expect } from "vitest";
import { SessionReportGenerator } from "../intelligence/session-summary";
import { SessionFactStore } from "../intelligence/fact-store";

describe("Session Intelligence & Fact Store", () => {
  it("should record verified facts and generate a structured post-session report", () => {
    const factStore = new SessionFactStore();
    factStore.recordFact({
      sessionId: "session_abc",
      category: "PERFORMANCE",
      statement: "Memory utilization reduced from 85% to 42% post Chrome restart",
      source: "diagnostics_delta",
    });

    const report = SessionReportGenerator.generateReport({
      sessionId: "session_abc",
      factStore,
      executedActions: [
        {
          actionId: "act_1",
          tool: "restart_supported_application",
          result: { toolCallId: "c1", name: "restart", success: true, result: {}, durationMs: 120 },
          verified: true,
        },
      ],
    });

    expect(report.reportId).toContain("rep_session_abc_");
    expect(report.resolution).toBe("RESOLVED");
    expect(report.actionsExecuted.length).toBe(1);
    expect(report.recommendations[0]?.evidence).toContain("Memory utilization reduced");
  });

  it("should mark resolution as UNRESOLVED when critical findings have no verified fix", () => {
    const report = SessionReportGenerator.generateReport({
      sessionId: "session_unresolved",
      findings: [
        {
          id: "f1",
          category: "PERFORMANCE",
          severity: "CRITICAL",
          statement: "Memory leak causing persistent swap thrashing",
          confidence: "HIGH",
          evidence: [],
        },
      ],
      executedActions: [],
    });

    expect(report.resolution).toBe("UNRESOLVED");
    expect(report.unresolvedIssues.length).toBeGreaterThan(0);
  });
});
