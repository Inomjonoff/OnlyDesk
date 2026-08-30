import { describe, it, expect } from "vitest";
import { RegisterSchema, LoginSchema } from "../auth.schema";
import { RegisterDeviceSchema } from "../device.schema";
import { CreateSessionSchema } from "../session.schema";
import { AIDiagnosticResponseSchema } from "../ai.schema";

describe("Validation Package", () => {
  it("validates register schema", () => {
    const valid = RegisterSchema.safeParse({
      email: "user@nexusdesk.ai",
      password: "Password123",
      name: "Alice Developer",
    });
    expect(valid.success).toBe(true);

    const invalid = RegisterSchema.safeParse({
      email: "invalid-email",
      password: "short",
      name: "A",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates device registration schema with NXD-XXXX-XXXX format", () => {
    const valid = RegisterDeviceSchema.safeParse({
      displayId: "NXD-AB12-CD34",
      name: "Engineering Laptop",
      fingerprint: "SHA256:0123456789abcdef0123456789abcdef",
      publicKey: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExampleValidKey1234567890",
      platform: "WINDOWS",
      osVersion: "Windows 11 23H2",
      appVersion: "1.0.0",
    });
    expect(valid.success).toBe(true);
  });

  it("validates session creation and permissions", () => {
    const valid = CreateSessionSchema.safeParse({
      targetDeviceId: "dev_123",
      requestedPermissions: ["SCREEN_VIEW", "MOUSE_CONTROL"],
    });
    expect(valid.success).toBe(true);
  });

  it("validates structured AI diagnostic schema with observed/inferred breakdown", () => {
    const valid = AIDiagnosticResponseSchema.safeParse({
      summary: "High CPU usage detected due to background render process",
      severity: "high",
      findings: [
        {
          component: "CPU",
          metric: "Utilization",
          value: 94.5,
          anomaly: "Spike exceeding 90% threshold for >30s",
        },
      ],
      observed: ["CPU is at 94.5%"],
      inferred: ["Rendering task is consuming cycles"],
      unknown: ["Exact user intent"],
      possibleCauses: ["Stuck render thread", "Crypto miner"],
      recommendations: ["Inspect top PID", "Restart process if hung"],
      suggestedActions: [
        {
          id: "act_1",
          action: "get_process_list",
          description: "Retrieve active process metrics",
          riskLevel: "LOW",
          requiresElevation: false,
          userApprovalRequired: false,
        },
      ],
      confidence: 0.92,
    });
    expect(valid.success).toBe(true);
  });
});
