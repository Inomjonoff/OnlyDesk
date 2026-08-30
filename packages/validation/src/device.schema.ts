import { z } from "zod";

export const RegisterDeviceSchema = z.object({
  displayId: z.string().regex(/^NXD-[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Invalid device ID format"),
  name: z.string().min(1).max(100),
  fingerprint: z.string().regex(/^SHA256:[a-f0-9]{32}$/, "Invalid fingerprint format"),
  publicKey: z.string().min(30, "Valid public key required"),
  platform: z.enum(["WINDOWS", "MACOS", "LINUX"]),
  osVersion: z.string().min(1),
  appVersion: z.string().min(1),
});

export const DeviceHeartbeatSchema = z.object({
  deviceId: z.string().min(1),
  status: z.enum(["ONLINE", "OFFLINE", "BUSY", "STALE"]),
  systemMetrics: z
    .object({
      cpuPercent: z.number().min(0).max(100),
      memoryUsedMb: z.number().nonnegative(),
      memoryTotalMb: z.number().positive(),
    })
    .optional(),
});

export type RegisterDeviceInput = z.infer<typeof RegisterDeviceSchema>;
export type DeviceHeartbeatInput = z.infer<typeof DeviceHeartbeatSchema>;
