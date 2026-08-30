import { AiRiskLevel } from "@nexusdesk/types";

export class RiskPolicyClassifier {
  public static classifyToolRisk(toolName: string): AiRiskLevel {
    if (toolName.startsWith("get_") || toolName === "analyze_current_screen") {
      return "READ_ONLY";
    }

    if (
      toolName === "open_application" ||
      toolName === "open_system_settings" ||
      toolName === "collect_application_log" ||
      toolName === "ai_scroll"
    ) {
      return "LOW";
    }

    if (
      toolName === "restart_supported_application" ||
      toolName === "ai_click" ||
      toolName === "ai_type"
    ) {
      return "MEDIUM";
    }

    if (toolName === "close_application" || toolName === "clear_system_cache") {
      return "HIGH";
    }

    return "CRITICAL";
  }
}
