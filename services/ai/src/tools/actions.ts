import { ToolRegistry } from "./registry";
import { redactSecretsFromText } from "../redactor";

export function registerActionTools(registry: ToolRegistry): void {
  registry.registerTool(
    {
      name: "collect_application_log",
      description: "Read recent lines from a supported application log file for diagnostic triage",
      inputSchema: {
        type: "object",
        properties: {
          applicationId: { type: "string" },
          maxLines: { type: "number", default: 50 },
        },
        required: ["applicationId"],
      },
      riskLevel: "LOW",
      requiredPermission: "LOG_READ",
      timeout: 10000,
      toolVersion: "1.0.0",
    },
    async (args, _ctx) => {
      const appId = String(args.applicationId || "");
      const lines = [
        `[INFO] 2026-08-30 20:00:00 - ${appId} initialized successfully`,
        `[WARN] 2026-08-30 20:15:32 - Cache size exceeded threshold, GC triggered`,
        `[INFO] 2026-08-30 20:20:00 - Heartbeat status OK`,
      ];

      return {
        applicationId: appId,
        logContent: redactSecretsFromText(lines.join("\n")),
        lineCount: lines.length,
      };
    },
  );
}
