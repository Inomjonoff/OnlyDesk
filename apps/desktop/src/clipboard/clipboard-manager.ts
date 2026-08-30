import {
  ClipboardType,
  ClipboardUpdateMessage,
  ClipboardAckMessage,
  SessionPermission,
  ClipboardTelemetrySnapshot,
} from "@nexusdesk/types";
import { ChunkPipeline } from "../files/chunk-pipeline";

export interface ClipboardSender {
  sendClipboardMessage(message: ClipboardUpdateMessage | ClipboardAckMessage): void;
}

export type ClipboardEventHandler = (event: { type: string; data: unknown }) => void;

export class ClipboardManager {
  private sender: ClipboardSender | null = null;
  private localDeviceId: string;
  private permissions = new Set<SessionPermission>();

  private sequence = 0;
  private lastAppliedHash: string | null = null;
  private lastOriginatedHash: string | null = null;

  private updatesSent = 0;
  private updatesReceived = 0;
  private updatesRejected = 0;
  private lastSyncTimestamp = 0;

  private readonly maxTextBytes = 1024 * 1024; // 1 MiB
  private readonly maxImageBytes = 10 * 1024 * 1024; // 10 MiB

  private handlers = new Map<string, Set<ClipboardEventHandler>>();

  constructor(localDeviceId: string, grantedPermissions: SessionPermission[] = []) {
    this.localDeviceId = localDeviceId;
    this.setPermissions(grantedPermissions);
  }

  public setSender(sender: ClipboardSender): void {
    this.sender = sender;
  }

  public setPermissions(permissions: SessionPermission[]): void {
    this.permissions = new Set(permissions);
  }

  public async syncLocalClipboard(type: ClipboardType, content: string): Promise<boolean> {
    if (!this.permissions.has("CLIPBOARD_READ")) {
      this.updatesRejected++;
      return false;
    }

    const contentBytes = new TextEncoder().encode(content);
    if (type === "TEXT" && contentBytes.byteLength > this.maxTextBytes) {
      this.updatesRejected++;
      this.emit("error", { message: "Clipboard text exceeds 1 MiB limit" });
      return false;
    }
    if (type === "IMAGE" && contentBytes.byteLength > this.maxImageBytes) {
      this.updatesRejected++;
      this.emit("error", { message: "Clipboard image exceeds 10 MiB limit" });
      return false;
    }

    const contentHash = await ChunkPipeline.computeSha256Hex(contentBytes);

    // Loop prevention: do not rebroadcast content that was just applied from remote
    if (contentHash === this.lastAppliedHash) {
      return false;
    }

    // Do not rebroadcast identical local content
    if (contentHash === this.lastOriginatedHash) {
      return false;
    }

    this.lastOriginatedHash = contentHash;
    this.sequence++;
    this.updatesSent++;
    this.lastSyncTimestamp = Date.now();

    const clipboardId = `clp_${Date.now()}_${this.sequence}`;
    const updateMsg: ClipboardUpdateMessage = {
      type: "clipboard.update",
      clipboardId,
      originDeviceId: this.localDeviceId,
      sequence: this.sequence,
      clipboardType: type,
      content,
      sha256: contentHash,
      sizeBytes: contentBytes.byteLength,
      timestamp: Date.now(),
    };

    if (this.sender) {
      this.sender.sendClipboardMessage(updateMsg);
    }
    this.emit("clipboard_sent", { clipboardId, type, sizeBytes: contentBytes.byteLength });
    return true;
  }

  public async handleIncomingMessage(
    msg: ClipboardUpdateMessage | ClipboardAckMessage,
  ): Promise<boolean> {
    if (msg.type === "clipboard.ack") {
      this.emit("clipboard_ack", { clipboardId: msg.clipboardId, sequence: msg.sequence });
      return true;
    }

    if (msg.type === "clipboard.update") {
      // Loop prevention: ignore own broadcasts
      if (msg.originDeviceId === this.localDeviceId) {
        return false;
      }

      // Permission check: CLIPBOARD_WRITE required to accept remote clipboard
      if (!this.permissions.has("CLIPBOARD_WRITE")) {
        this.updatesRejected++;
        this.emit("rejected", { reason: "CLIPBOARD_WRITE_DENIED" });
        return false;
      }

      // Size check
      if (msg.clipboardType === "TEXT" && msg.sizeBytes > this.maxTextBytes) {
        this.updatesRejected++;
        return false;
      }
      if (msg.clipboardType === "IMAGE" && msg.sizeBytes > this.maxImageBytes) {
        this.updatesRejected++;
        return false;
      }

      // Hash integrity verification
      const contentBytes = new TextEncoder().encode(msg.content);
      const computedHash = await ChunkPipeline.computeSha256Hex(contentBytes);
      if (computedHash.toLowerCase() !== msg.sha256.toLowerCase()) {
        this.updatesRejected++;
        this.emit("rejected", { reason: "HASH_MISMATCH" });
        return false;
      }

      this.lastAppliedHash = computedHash;
      this.updatesReceived++;
      this.lastSyncTimestamp = Date.now();

      // Send ack
      const ackMsg: ClipboardAckMessage = {
        type: "clipboard.ack",
        clipboardId: msg.clipboardId,
        sequence: msg.sequence,
        applied: true,
        timestamp: Date.now(),
      };
      if (this.sender) {
        this.sender.sendClipboardMessage(ackMsg);
      }

      this.emit("clipboard_applied", {
        clipboardId: msg.clipboardId,
        type: msg.clipboardType,
        content: msg.content,
        originDeviceId: msg.originDeviceId,
      });
      return true;
    }

    return false;
  }

  public getTelemetry(): ClipboardTelemetrySnapshot {
    return {
      clipboardUpdatesSent: this.updatesSent,
      clipboardUpdatesReceived: this.updatesReceived,
      clipboardUpdatesRejected: this.updatesRejected,
      lastSyncTimestamp: this.lastSyncTimestamp,
    };
  }

  public on(event: string, handler: ClipboardEventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private emit(type: string, data: unknown): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        handler({ type, data });
      }
    }
  }
}
