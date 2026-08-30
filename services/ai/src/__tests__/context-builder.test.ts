import { describe, it, expect } from "vitest";
import { SessionContextBuilder } from "../context/session-context";
import { DiagnosticsContextBuilder } from "../context/diagnostics-context";

describe("Context Builders", () => {
  it("should assemble session context and estimate token counts", () => {
    const builder = new SessionContextBuilder();
    const result = builder.buildContext({
      baseSystemPrompt: "Base prompt",
      sessionInfo: {
        sessionId: "session_123",
        initiatorDeviceId: "dev_a",
        targetDeviceId: "dev_b",
        grantedPermissions: ["SYSTEM_INFO"],
        createdAt: Date.now(),
      },
      conversationMessages: [
        {
          messageId: "m1",
          conversationId: "c1",
          role: "user",
          content: "Is my CPU ok?",
          timestamp: Date.now(),
        },
      ],
    });

    expect(result.systemPrompt).toContain("Session ID: session_123");
    expect(result.systemPrompt).toContain("Active Permissions: SYSTEM_INFO");
    expect(result.messages.length).toBe(1);
    expect(result.tokenEstimate).toBeGreaterThan(0);
  });

  it("should create diagnostic snapshots with top-N processes", () => {
    const rawData = {
      cpu: { usagePercent: 45.0, cores: 8 },
      memory: { usedBytes: 8000000000, totalBytes: 16000000000, usagePercent: 50.0 },
      processes: [
        { pid: 1, name: "proc1", cpuPercent: 10, memoryBytes: 1000000, status: "RUNNING" },
        { pid: 2, name: "proc2", cpuPercent: 30, memoryBytes: 2000000, status: "RUNNING" },
      ],
    };

    const snapshot = DiagnosticsContextBuilder.createSnapshot("s1", rawData);
    expect(snapshot.snapshotId).toContain("diag_s1_");
    expect(snapshot.processes?.length).toBe(2);
    expect(DiagnosticsContextBuilder.isSnapshotFresh(snapshot)).toBe(true);
  });
});
