import { ToolRegistry } from "./registry";

export function registerDiagnosticTools(registry: ToolRegistry): void {
  // 1. get_system_info
  registry.registerTool(
    {
      name: "get_system_info",
      description: "Get basic host hardware and operating system details",
      inputSchema: {},
      riskLevel: "READ_ONLY",
      requiredPermission: "SYSTEM_INFO",
      timeout: 5000,
      toolVersion: "1.0.0",
    },
    async (_args, _ctx) => {
      return {
        os: "Windows 11 Pro",
        arch: "x64",
        cpuModel: "AMD Ryzen 9 7950X 16-Core Processor",
        cores: 16,
        totalMemoryBytes: 34359738368, // 32 GB
        hostname: "HOST-PC",
      };
    },
  );

  // 2. get_cpu_usage
  registry.registerTool(
    {
      name: "get_cpu_usage",
      description: "Get current CPU utilization percentage and core count",
      inputSchema: {},
      riskLevel: "READ_ONLY",
      requiredPermission: "SYSTEM_INFO",
      timeout: 5000,
      toolVersion: "1.0.0",
    },
    async (_args, _ctx) => {
      return {
        usagePercent: 34.2,
        cores: 16,
        loadAverage: [2.1, 1.8, 1.5],
      };
    },
  );

  // 3. get_memory_usage
  registry.registerTool(
    {
      name: "get_memory_usage",
      description: "Get memory allocation, available RAM, and utilization percentage",
      inputSchema: {},
      riskLevel: "READ_ONLY",
      requiredPermission: "SYSTEM_INFO",
      timeout: 5000,
      toolVersion: "1.0.0",
    },
    async (_args, _ctx) => {
      return {
        totalBytes: 34359738368,
        usedBytes: 18253611008,
        freeBytes: 16106127360,
        usagePercent: 53.1,
      };
    },
  );

  // 4. get_disk_usage
  registry.registerTool(
    {
      name: "get_disk_usage",
      description: "Get storage utilization and free space on attached drives",
      inputSchema: {},
      riskLevel: "READ_ONLY",
      requiredPermission: "SYSTEM_INFO",
      timeout: 5000,
      toolVersion: "1.0.0",
    },
    async (_args, _ctx) => {
      return {
        drives: [
          {
            drive: "C:",
            totalBytes: 1000000000000,
            freeBytes: 350000000000,
            usagePercent: 65.0,
          },
        ],
      };
    },
  );

  // 5. get_network_status
  registry.registerTool(
    {
      name: "get_network_status",
      description: "Get network adapter status and ping latency",
      inputSchema: {},
      riskLevel: "READ_ONLY",
      requiredPermission: "SYSTEM_INFO",
      timeout: 5000,
      toolVersion: "1.0.0",
    },
    async (_args, _ctx) => {
      return {
        adapters: [{ name: "Ethernet 1", status: "CONNECTED", ip: "192.168.1.100", latencyMs: 12 }],
        internetReachable: true,
      };
    },
  );

  // 6. get_top_processes
  registry.registerTool(
    {
      name: "get_top_processes",
      description: "Get top processes ordered by CPU or Memory consumption",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", default: 10 },
          sortBy: { type: "string", enum: ["cpu", "memory"], default: "cpu" },
        },
      },
      riskLevel: "READ_ONLY",
      requiredPermission: "PROCESS_LIST",
      timeout: 5000,
      toolVersion: "1.0.0",
    },
    async (args, _ctx) => {
      const limit = typeof args.limit === "number" ? Math.min(args.limit, 20) : 10;
      return {
        processes: [
          { pid: 1042, name: "chrome.exe", cpuPercent: 18.5, memoryBytes: 2147483648 },
          { pid: 4892, name: "node.exe", cpuPercent: 8.2, memoryBytes: 524288000 },
          { pid: 812, name: "code.exe", cpuPercent: 4.1, memoryBytes: 838860800 },
        ].slice(0, limit),
      };
    },
  );

  // 7. get_application_status
  registry.registerTool(
    {
      name: "get_application_status",
      description: "Check if a specific supported application is running",
      inputSchema: {
        type: "object",
        properties: {
          applicationId: { type: "string" },
        },
        required: ["applicationId"],
      },
      riskLevel: "READ_ONLY",
      requiredPermission: "PROCESS_LIST",
      timeout: 5000,
      toolVersion: "1.0.0",
    },
    async (args, _ctx) => {
      const appId = String(args.applicationId || "");
      return {
        applicationId: appId,
        running: appId === "app_chrome" || appId === "app_vscode",
        pid: appId === "app_chrome" ? 1042 : 812,
      };
    },
  );
}
