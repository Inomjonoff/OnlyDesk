import { describe, it, expect } from "vitest";
import { ActionPolicyEngine } from "../policy/action-policy";
import { AiActionProposal, AiPolicyContext } from "@nexusdesk/types";

describe("ActionPolicyEngine", () => {
  const baseProposal: AiActionProposal = {
    proposalId: "prop_1",
    sessionId: "s1",
    deviceId: "d1",
    userId: "u1",
    aiRequestId: "req_1",
    tool: "restart_supported_application",
    arguments: { applicationId: "app_chrome" },
    argumentsHash: "hash_1",
    reason: "Free RAM",
    risk: "MEDIUM",
    requiresApproval: true,
    status: "APPROVAL_PENDING",
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000,
  };

  it("should evaluate OBSERVE_ONLY mode: allow READ_ONLY, deny modifying tools", () => {
    const context: AiPolicyContext = {
      userId: "u1",
      deviceId: "d1",
      sessionId: "s1",
      permissions: ["SYSTEM_INFO", "COMMAND_REQUEST"],
      automationMode: "OBSERVE_ONLY",
    };

    // READ_ONLY tool is allowed
    const readOnlyProp = { ...baseProposal, tool: "get_cpu_usage", risk: "READ_ONLY" as const };
    expect(ActionPolicyEngine.evaluateAction(readOnlyProp, context)).toBe("ALLOW");

    // MEDIUM risk tool is DENIED in OBSERVE_ONLY mode
    expect(ActionPolicyEngine.evaluateAction(baseProposal, context)).toBe("DENY");
  });

  it("should evaluate ASK_BEFORE_ACTION mode: require approval for MEDIUM risk", () => {
    const context: AiPolicyContext = {
      userId: "u1",
      deviceId: "d1",
      sessionId: "s1",
      permissions: ["SYSTEM_INFO", "COMMAND_REQUEST"],
      automationMode: "ASK_BEFORE_ACTION",
    };

    expect(ActionPolicyEngine.evaluateAction(baseProposal, context)).toBe("REQUIRE_APPROVAL");
  });

  it("should deny actions when required session permission is missing", () => {
    const context: AiPolicyContext = {
      userId: "u1",
      deviceId: "d1",
      sessionId: "s1",
      permissions: [], // No permissions
      automationMode: "ASK_BEFORE_ACTION",
    };

    const screenProp = {
      ...baseProposal,
      tool: "analyze_current_screen",
      risk: "READ_ONLY" as const,
    };
    expect(ActionPolicyEngine.evaluateAction(screenProp, context)).toBe("DENY");
  });

  it("should deny computer use tools if organization policy disables it", () => {
    const context: AiPolicyContext = {
      userId: "u1",
      deviceId: "d1",
      sessionId: "s1",
      permissions: ["AI_COMPUTER_USE"],
      automationMode: "ASK_BEFORE_ACTION",
      organizationPolicy: {
        aiEnabled: true,
        externalProvidersEnabled: true,
        visionEnabled: true,
        computerUseEnabled: false, // Disabled at org level
        autoActionsEnabled: false,
      },
    };

    const cuProp = { ...baseProposal, tool: "ai_click", risk: "MEDIUM" as const };
    expect(ActionPolicyEngine.evaluateAction(cuProp, context)).toBe("DENY");
  });
});
