import { describe, it, expect, beforeAll } from "vitest";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";
import { generateEd25519KeyPair, generateDeviceId } from "@nexusdesk/crypto";

describe("Phase 1: Device Registration & Presence Integration Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  const deviceKeys = generateEd25519KeyPair();
  const displayId = generateDeviceId();

  const testDevice = {
    displayId,
    name: "Engineering Laptop (Windows 11)",
    fingerprint: deviceKeys.fingerprint,
    publicKey: deviceKeys.publicKeyPem,
    platform: "WINDOWS",
    osVersion: "Windows 11 Pro 23H2",
    appVersion: "1.0.0",
  };

  let createdDeviceId: string;

  it("registers and enrolls a new device with Ed25519 public key fingerprint", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/devices",
      payload: testDevice,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.device.id).toBeDefined();
    expect(body.device.displayId).toBe(testDevice.displayId);
    expect(body.device.fingerprint).toBe(testDevice.fingerprint);
    expect(body.device.status).toBe("ONLINE");

    createdDeviceId = body.device.id;
  });

  it("rejects device registration with forged public key fingerprint", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/devices",
      payload: {
        ...testDevice,
        displayId: generateDeviceId(),
        fingerprint: "SHA256:00000000000000000000000000000000", // Forged!
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe("INVALID_FINGERPRINT");
  });

  it("records heartbeat and updates live telemetry metrics", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/devices/heartbeat",
      payload: {
        deviceId: createdDeviceId,
        status: "ONLINE",
        systemMetrics: {
          cpuPercent: 24.5,
          memoryUsedMb: 8192,
          memoryTotalMb: 32768,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ONLINE");
    expect(body.acknowledgedAt).toBeDefined();
  });

  it("retrieves device details including computed presence status", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/devices/${createdDeviceId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.device.id).toBe(createdDeviceId);
    expect(body.device.status).toBe("ONLINE");
    expect(body.device.systemMetrics.cpuPercent).toBe(24.5);
  });

  it("lists all registered devices in the fleet", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/devices",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.devices)).toBe(true);
    const found = body.devices.find((d: { id: string }) => d.id === createdDeviceId);
    expect(found).toBeDefined();
  });
});
