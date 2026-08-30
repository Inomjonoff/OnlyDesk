import { AiDiagnosticSnapshot, AiProcessInfo, AiApplicationInfo } from "@nexusdesk/types";
import { redactProcessCommandLine, redactSecretsFromObject } from "../redactor";

export interface RawDiagnosticData {
  cpu?: { usagePercent: number; cores: number; model?: string };
  memory?: { usedBytes: number; totalBytes: number; usagePercent: number };
  disk?: Array<{ drive: string; freeBytes: number; totalBytes: number; usagePercent: number }>;
  network?: { adapters: Array<{ name: string; status: string; latencyMs?: number }> };
  gpu?: { name?: string; usagePercent?: number; memoryUsedBytes?: number };
  uptime?: number;
  processes?: Array<{
    pid: number;
    name: string;
    commandLine?: string;
    cpuPercent: number;
    memoryBytes: number;
    status: string;
  }>;
  applications?: AiApplicationInfo[];
}

export class DiagnosticsContextBuilder {
  public static createSnapshot(sessionId: string, raw: RawDiagnosticData): AiDiagnosticSnapshot {
    // 1. Filter and sanitize top processes (top 20 CPU and top 20 Memory)
    let sanitizedProcesses: AiProcessInfo[] | undefined;
    if (raw.processes && raw.processes.length > 0) {
      const topCpu = [...raw.processes].sort((a, b) => b.cpuPercent - a.cpuPercent).slice(0, 15);
      const topMem = [...raw.processes].sort((a, b) => b.memoryBytes - a.memoryBytes).slice(0, 15);
      const combinedMap = new Map<number, AiProcessInfo>();

      for (const p of [...topCpu, ...topMem]) {
        if (!combinedMap.has(p.pid)) {
          combinedMap.set(p.pid, {
            pid: p.pid,
            name: redactProcessCommandLine(p.name),
            cpuPercent: p.cpuPercent,
            memoryBytes: p.memoryBytes,
            status: p.status,
          });
        }
      }

      sanitizedProcesses = Array.from(combinedMap.values());
    }

    // 2. Sanitize applications
    const sanitizedApps = raw.applications
      ? (redactSecretsFromObject(raw.applications) as AiApplicationInfo[])
      : undefined;

    return {
      snapshotId: `diag_${sessionId}_${Date.now()}`,
      sessionId,
      observedAt: Date.now(),
      stale: false,
      cpu: raw.cpu,
      memory: raw.memory,
      disk: raw.disk,
      network: raw.network,
      gpu: raw.gpu,
      uptime: raw.uptime,
      processes: sanitizedProcesses,
      applications: sanitizedApps,
    };
  }

  public static isSnapshotFresh(snapshot: AiDiagnosticSnapshot, maxAgeMs = 15000): boolean {
    return Date.now() - snapshot.observedAt <= maxAgeMs;
  }
}
