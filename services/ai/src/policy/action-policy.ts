import {
  AiActionProposal,
  AiAutomationMode,
  AiPolicyContext,
  AiPolicyDecision,
  AiRiskLevel,
} from "@nexusdesk/types";

export class ActionPolicyEngine {
  /**
   * Evaluates an action proposal against the active policy matrix (spec §364).
   * Hierarchy: Organization Policy > Device Policy > Session Permissions > Automation Mode > Tool Risk
   * Most restrictive rule ALWAYS wins.
   */
  public static evaluateAction(
    proposal: AiActionProposal,
    context: AiPolicyContext,
  ): AiPolicyDecision {
    // 1. Organization Level Gating
    if (context.organizationPolicy && !context.organizationPolicy.aiEnabled) {
      return "DENY";
    }

    if (
      proposal.tool.startsWith("ai_") &&
      context.organizationPolicy &&
      !context.organizationPolicy.computerUseEnabled
    ) {
      return "DENY";
    }

    // 2. Session Permission Gating
    if (proposal.tool.startsWith("ai_") && !context.permissions.includes("AI_COMPUTER_USE")) {
      return "DENY";
    }

    if (
      proposal.tool === "analyze_current_screen" &&
      !context.permissions.includes("AI_SCREEN_ANALYSIS")
    ) {
      return "DENY";
    }

    if (
      (proposal.tool === "get_process_list" || proposal.tool === "get_top_processes") &&
      !context.permissions.includes("PROCESS_LIST")
    ) {
      return "DENY";
    }

    if (
      proposal.tool.startsWith("get_") &&
      proposal.tool !== "get_process_list" &&
      proposal.tool !== "get_top_processes" &&
      !context.permissions.includes("SYSTEM_INFO")
    ) {
      return "DENY";
    }

    // 3. Automation Mode Policy Matrix Evaluation (spec §364)
    return this.evaluateMatrix(context.automationMode, proposal.risk);
  }

  private static evaluateMatrix(mode: AiAutomationMode, risk: AiRiskLevel): AiPolicyDecision {
    switch (mode) {
      case "OBSERVE_ONLY":
        // In OBSERVE_ONLY mode: only READ_ONLY allowed; all modifications denied
        return risk === "READ_ONLY" ? "ALLOW" : "DENY";

      case "RECOMMEND":
        // In RECOMMEND mode: READ_ONLY allowed, modifications require approval
        if (risk === "READ_ONLY") return "ALLOW";
        if (risk === "CRITICAL") return "DENY";
        return "REQUIRE_APPROVAL";

      case "ASK_BEFORE_ACTION":
        // Standard default mode
        if (risk === "READ_ONLY") return "ALLOW";
        if (risk === "LOW" || risk === "MEDIUM" || risk === "HIGH") return "REQUIRE_APPROVAL";
        return "DENY";

      case "LIMITED_AUTO":
        // Auto executes LOW risk, asks for MEDIUM/HIGH, denies CRITICAL
        if (risk === "READ_ONLY" || risk === "LOW") return "ALLOW";
        if (risk === "MEDIUM" || risk === "HIGH") return "REQUIRE_APPROVAL";
        return "DENY";

      default:
        return "DENY";
    }
  }
}
