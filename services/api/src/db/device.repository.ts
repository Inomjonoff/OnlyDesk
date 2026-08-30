import { Device, DevicePlatform, DeviceState } from "@nexusdesk/types";
import { generateSecureToken, computePublicKeyFingerprint } from "@nexusdesk/crypto";

export interface StoredDevice extends Device {
  systemMetrics?: {
    cpuPercent: number;
    memoryUsedMb: number;
    memoryTotalMb: number;
  };
}

export class DeviceRepository {
  private devices = new Map<string, StoredDevice>(); // key: id
  private displayIdIndex = new Map<string, string>(); // displayId -> id
  private fingerprintIndex = new Map<string, string>(); // fingerprint -> id

  public async registerDevice(data: {
    displayId: string;
    name: string;
    fingerprint: string;
    publicKey: string;
    platform: DevicePlatform;
    osVersion: string;
    appVersion: string;
    userId?: string;
    organizationId?: string;
  }): Promise<Device> {
    // Check for displayId or fingerprint collisions
    if (this.displayIdIndex.has(data.displayId)) {
      const existingId = this.displayIdIndex.get(data.displayId)!;
      const existing = this.devices.get(existingId)!;
      // Update existing device registration
      existing.name = data.name;
      existing.osVersion = data.osVersion;
      existing.appVersion = data.appVersion;
      existing.userId = data.userId || existing.userId;
      existing.status = "ONLINE";
      existing.lastSeenAt = new Date();
      existing.updatedAt = new Date();
      return this.computePresence(existing);
    }

    // Verify that computed public key fingerprint matches claimed fingerprint
    const derivedFingerprint = computePublicKeyFingerprint(data.publicKey);
    if (derivedFingerprint !== data.fingerprint) {
      throw new Error("FINGERPRINT_MISMATCH");
    }

    const id = `dev_${generateSecureToken(8)}`;
    const now = new Date();

    const storedDevice: StoredDevice = {
      id,
      displayId: data.displayId,
      name: data.name,
      fingerprint: data.fingerprint,
      publicKey: data.publicKey,
      platform: data.platform,
      osVersion: data.osVersion,
      appVersion: data.appVersion,
      status: "ONLINE",
      userId: data.userId,
      organizationId: data.organizationId,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.devices.set(id, storedDevice);
    this.displayIdIndex.set(data.displayId, id);
    this.fingerprintIndex.set(data.fingerprint, id);

    return this.computePresence(storedDevice);
  }

  public async findById(id: string): Promise<StoredDevice | null> {
    const device = this.devices.get(id);
    if (!device) return null;
    return this.computePresence(device);
  }

  public async findByDisplayId(displayId: string): Promise<StoredDevice | null> {
    const id = this.displayIdIndex.get(displayId);
    if (!id) return null;
    return this.findById(id);
  }

  public async listByUserId(userId: string): Promise<StoredDevice[]> {
    const results: StoredDevice[] = [];
    for (const device of this.devices.values()) {
      if (device.userId === userId) {
        results.push(this.computePresence(device));
      }
    }
    return results;
  }

  public async listAll(): Promise<StoredDevice[]> {
    return Array.from(this.devices.values()).map((d) => this.computePresence(d));
  }

  public async recordHeartbeat(
    deviceId: string,
    status: DeviceState,
    systemMetrics?: { cpuPercent: number; memoryUsedMb: number; memoryTotalMb: number },
  ): Promise<StoredDevice | null> {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    device.lastSeenAt = new Date();
    device.status = status;
    if (systemMetrics) {
      device.systemMetrics = systemMetrics;
    }
    device.updatedAt = new Date();

    return this.computePresence(device);
  }

  public async deleteDevice(id: string): Promise<boolean> {
    const device = this.devices.get(id);
    if (!device) return false;

    this.displayIdIndex.delete(device.displayId);
    this.fingerprintIndex.delete(device.fingerprint);
    this.devices.delete(id);
    return true;
  }

  private computePresence(device: StoredDevice): StoredDevice {
    const now = Date.now();
    const lastSeen = new Date(device.lastSeenAt).getTime();
    const diffSeconds = (now - lastSeen) / 1000;

    let computedStatus: DeviceState = device.status;
    if (diffSeconds > 30) {
      computedStatus = "OFFLINE";
    } else if (diffSeconds > 15) {
      computedStatus = "STALE";
    }

    return {
      ...device,
      status: computedStatus,
    };
  }
}

export const deviceRepository = new DeviceRepository();
