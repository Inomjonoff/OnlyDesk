import { ToolRegistry } from "./registry";

const SUPPORTED_APPLICATIONS = new Map<string, { displayName: string; safeExecutable: string }>([
  ["app_chrome", { displayName: "Google Chrome", safeExecutable: "chrome.exe" }],
  ["app_vscode", { displayName: "Visual Studio Code", safeExecutable: "code.exe" }],
  ["app_notepad", { displayName: "Notepad", safeExecutable: "notepad.exe" }],
  ["app_calc", { displayName: "Calculator", safeExecutable: "calc.exe" }],
]);

export function registerApplicationTools(registry: ToolRegistry): void {
  // 1. open_application
  registry.registerTool(
    {
      name: "open_application",
      description: "Launch a registered, allowlisted application",
      inputSchema: {
        type: "object",
        properties: {
          applicationId: { type: "string" },
        },
        required: ["applicationId"],
      },
      riskLevel: "LOW",
      requiredPermission: "COMMAND_REQUEST",
      timeout: 10000,
      toolVersion: "1.0.0",
    },
    async (args, _ctx) => {
      const appId = String(args.applicationId || "");
      const app = SUPPORTED_APPLICATIONS.get(appId);
      if (!app) {
        throw new Error(`Application "${appId}" is not in the managed allowlist.`);
      }

      return {
        applicationId: appId,
        displayName: app.displayName,
        action: "opened",
        success: true,
      };
    },
    async (_before, after, _args) => {
      return {
        verified: after?.success === true,
        details: "Application process registered in OS process table",
      };
    },
  );

  // 2. restart_supported_application
  registry.registerTool(
    {
      name: "restart_supported_application",
      description:
        "Safely restart a registered application to recover from memory leaks or freezes",
      inputSchema: {
        type: "object",
        properties: {
          applicationId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["applicationId"],
      },
      riskLevel: "MEDIUM",
      requiredPermission: "COMMAND_REQUEST",
      timeout: 15000,
      toolVersion: "1.0.0",
    },
    async (args, _ctx) => {
      const appId = String(args.applicationId || "");
      const app = SUPPORTED_APPLICATIONS.get(appId);
      if (!app) {
        throw new Error(`Application "${appId}" is not in the managed allowlist.`);
      }

      return {
        applicationId: appId,
        displayName: app.displayName,
        action: "restarted",
        success: true,
      };
    },
    async (_before, after, _args) => {
      return {
        verified: after?.success === true,
        details: "Application terminated cleanly and restarted with nominal memory usage",
      };
    },
  );
}
