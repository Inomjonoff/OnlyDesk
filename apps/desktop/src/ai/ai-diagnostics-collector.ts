import { AiDiagnosticSnapshot } from "@nexusdesk/types";

export class DesktopDiagnosticsCollector {
  public static collectSnapshot(sessionId: string): AiDiagnosticSnapshot {
    return {
      snapshotId: `diag_${sessionId}_${Date.now()}`,
      sessionId,
      observedAt: Date.now(),
      stale: false,
      cpu: {
        usagePercent: 28.4,
        cores: 16,
        model: "Host CPU",
      },
      memory: {
        totalBytes: 34359738368,
        usedBytes: 15032385536,
        usagePercent: 43.7,
      },
      disk: [
        {
          drive: "C:",
          totalBytes: 1000000000000,
          freeBytes: 420000000000,
          usagePercent: 58.0,
        },
      ],
      processes: [
        {
          pid: 1042,
          name: "chrome.exe",
          cpuPercent: 14.2,
          memoryBytes: 1610612736,
          status: "RUNNING",
        },
        { pid: 4892, name: "node.exe", cpuPercent: 6.1, memoryBytes: 419430400, status: "RUNNING" },
        { pid: 812, name: "code.exe", cpuPercent: 3.5, memoryBytes: 734003200, status: "RUNNING" },
      ],
      applications: [
        { applicationId: "app_chrome", displayName: "Google Chrome", running: true, pid: 1042 },
        { applicationId: "app_vscode", displayName: "Visual Studio Code", running: true, pid: 812 },
      ],
    };
  }
}
