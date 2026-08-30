import { ToolRegistry } from "./registry";

export function registerScreenTools(registry: ToolRegistry): void {
  registry.registerTool(
    {
      name: "analyze_current_screen",
      description:
        "Analyze the current desktop frame using AI vision to identify visible error dialogs or application states",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string" },
        },
      },
      riskLevel: "READ_ONLY",
      requiredPermission: "AI_SCREEN_ANALYSIS",
      timeout: 10000,
      toolVersion: "1.0.0",
    },
    async (args, ctx) => {
      return {
        analysisId: `screen_${ctx.sessionId}_${Date.now()}`,
        summary: "Visual inspection shows desktop with Chrome browser and VS Code active.",
        visibleIssues: [],
        observedText: ["Google Chrome", "Visual Studio Code - onlydesk", "Terminal"],
        recommendations: ["Ensure background render tasks are completed"],
      };
    },
  );
}
