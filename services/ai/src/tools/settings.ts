import { ToolRegistry } from "./registry";

const ALLOWED_SETTINGS_PAGES = new Set([
  "display",
  "sound",
  "notifications",
  "power",
  "storage",
  "network",
  "bluetooth",
  "apps",
  "windowsupdate",
]);

export function registerSettingsTools(registry: ToolRegistry): void {
  registry.registerTool(
    {
      name: "open_system_settings",
      description: "Navigate to a specific system settings page (e.g. display, network, storage)",
      inputSchema: {
        type: "object",
        properties: {
          page: { type: "string" },
        },
        required: ["page"],
      },
      riskLevel: "LOW",
      requiredPermission: "COMMAND_REQUEST",
      timeout: 5000,
      toolVersion: "1.0.0",
    },
    async (args, _ctx) => {
      const page = String(args.page || "").toLowerCase();
      if (!ALLOWED_SETTINGS_PAGES.has(page)) {
        throw new Error(
          `Settings page "${page}" is not permitted. Allowed: ${Array.from(ALLOWED_SETTINGS_PAGES).join(", ")}`,
        );
      }

      return {
        page,
        uri: `ms-settings:${page}`,
        opened: true,
      };
    },
  );
}
