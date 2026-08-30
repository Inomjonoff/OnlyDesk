export interface SystemTelemetry {
  os: string;
  osVersion: string;
  cpuModel: string;
  cpuCores: number;
  cpuPercent: number;
  memoryTotalBytes: number;
  memoryUsedBytes: number;
  memoryPercent: number;
  diskTotalBytes: number;
  diskUsedBytes: number;
  uptimeSeconds: number;
  timestamp: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryBytes: number;
}

export interface NetworkQualityStats {
  rttMs: number;
  packetLossPercent: number;
  jitterMs: number;
  bitrateKbps: number;
  fps: number;
  qualityGrade: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
}
