import { describe, it, expect } from "vitest";
import { ToolRegistry } from "../tools/registry";
import { registerDiagnosticTools } from "../tools/diagnostics";

describe("ToolRegistry", () => {
  it("should register tools and list their definitions", () => {
    const registry = new ToolRegistry();
    registerDiagnosticTools(registry);

    expect(registry.hasTool("get_cpu_usage")).toBe(true);
    expect(registry.hasTool("get_system_info")).toBe(true);
    expect(registry.hasTool("non_existent_tool")).toBe(false);

    const list = registry.listToolDefinitions();
    expect(list.length).toBeGreaterThanOrEqual(5);
  });

  it("should execute registered tool and return result", async () => {
    const registry = new ToolRegistry();
    registerDiagnosticTools(registry);

    const result = await registry.executeTool(
      "get_cpu_usage",
      {},
      { sessionId: "s1", deviceId: "d1", userId: "u1" },
    );

    expect(result.success).toBe(true);
    expect(result.name).toBe("get_cpu_usage");
    expect(result.result).toHaveProperty("usagePercent");
  });

  it("should deny unregistered tools safely", async () => {
    const registry = new ToolRegistry();

    const result = await registry.executeTool(
      "arbitrary_dangerous_tool",
      {},
      { sessionId: "s1", deviceId: "d1", userId: "u1" },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("is not registered");
  });

  it("should detect and block rapid tool call loops", async () => {
    const registry = new ToolRegistry();
    registerDiagnosticTools(registry);

    // Call 1: success
    const res1 = await registry.executeTool(
      "get_system_info",
      {},
      { sessionId: "s1", deviceId: "d1", userId: "u1" },
    );
    expect(res1.success).toBe(true);

    // Immediate duplicate call: loop detected
    const res2 = await registry.executeTool(
      "get_system_info",
      {},
      { sessionId: "s1", deviceId: "d1", userId: "u1" },
    );
    expect(res2.success).toBe(false);
    expect(res2.error).toContain("Tool loop detected");
  });
});
