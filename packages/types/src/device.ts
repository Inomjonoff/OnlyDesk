export type DevicePlatform = "WINDOWS" | "MACOS" | "LINUX";
export type DeviceState = "ONLINE" | "OFFLINE" | "BUSY" | "STALE";

export interface Device {
  id: string;
  displayId: string; // e.g. NXD-AB12-CD34
  name: string;
  fingerprint: string; // SHA256:xxxx...
  publicKey: string;
  platform: DevicePlatform;
  osVersion: string;
  appVersion: string;
  userId?: string;
  organizationId?: string;
  status: DeviceState;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceStatusUpdate {
  deviceId: string;
  status: DeviceState;
  timestamp: number;
  ipAddress?: string;
  systemMetrics?: {
    cpuPercent: number;
    memoryUsedMb: number;
    memoryTotalMb: number;
  };
}
