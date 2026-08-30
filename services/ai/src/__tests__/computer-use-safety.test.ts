import { describe, it, expect } from "vitest";
import { ComputerUseTool } from "../tools/computer-use";
import { ToolRegistry } from "../tools/registry";

describe("Computer Use Safety", () => {
  it("should create bounded control leases and decrement steps remaining", async () => {
    const registry = new ToolRegistry();
    const computerUse = new ComputerUseTool();
    computerUse.registerTools(registry);

    const lease = computerUse.createLease("s1", "d1", "prop_1", 3);
    expect(lease.stepsRemaining).toBe(3);
    expect(lease.maxSteps).toBe(3);

    // Step 1: click
    const res1 = await registry.executeTool(
      "ai_click",
      { leaseId: lease.leaseId, x: 0.5, y: 0.5 },
      { sessionId: "s1", deviceId: "d1", userId: "u1" },
    );
    expect(res1.success).toBe(true);
    expect(lease.stepsRemaining).toBe(2);

    // Step 2: scroll
    const res2 = await registry.executeTool(
      "ai_scroll",
      { leaseId: lease.leaseId, deltaY: 100 },
      { sessionId: "s1", deviceId: "d1", userId: "u1" },
    );
    expect(res2.success).toBe(true);
    expect(lease.stepsRemaining).toBe(1);
  });

  it("should reject coordinate values outside normalized [0, 1] range", async () => {
    const registry = new ToolRegistry();
    const computerUse = new ComputerUseTool();
    computerUse.registerTools(registry);

    const lease = computerUse.createLease("s1", "d1", "prop_2", 3);

    const outOfBounds = await registry.executeTool(
      "ai_click",
      { leaseId: lease.leaseId, x: 1.5, y: -0.2 }, // Invalid coords
      { sessionId: "s1", deviceId: "d1", userId: "u1" },
    );

    expect(outOfBounds.success).toBe(false);
    expect(outOfBounds.error).toContain("must be normalized numbers between 0.0 and 1.0");
  });

  it("should block AI from typing sensitive password patterns", async () => {
    const registry = new ToolRegistry();
    const computerUse = new ComputerUseTool();
    computerUse.registerTools(registry);

    const lease = computerUse.createLease("s1", "d1", "prop_3", 3);

    const pwdAttempt = await registry.executeTool(
      "ai_type",
      { leaseId: lease.leaseId, text: "MyPassword123!" },
      { sessionId: "s1", deviceId: "d1", userId: "u1" },
    );

    expect(pwdAttempt.success).toBe(false);
    expect(pwdAttempt.error).toContain("blocked from entering passwords");
  });

  it("should halt computer use immediately when emergency stop is triggered", async () => {
    const registry = new ToolRegistry();
    let emergencyStopped = false;

    const computerUse = new ComputerUseTool({
      executeStep: async () => ({ success: true }),
      isEmergencyStopped: () => emergencyStopped,
      isSensitiveUIPresent: async () => false,
    });
    computerUse.registerTools(registry);

    const lease = computerUse.createLease("s1", "d1", "prop_4", 3);

    // Trigger emergency stop
    emergencyStopped = true;

    const stoppedAttempt = await registry.executeTool(
      "ai_click",
      { leaseId: lease.leaseId, x: 0.2, y: 0.3 },
      { sessionId: "s1", deviceId: "d1", userId: "u1" },
    );

    expect(stoppedAttempt.success).toBe(false);
    expect(stoppedAttempt.error).toContain("Emergency stop active");
  });
});
