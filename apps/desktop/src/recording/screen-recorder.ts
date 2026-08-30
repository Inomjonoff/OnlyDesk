import {
  RecordingMetadata,
  RecordingStatus,
  RecordingConsentState,
  SessionPermission,
} from "@nexusdesk/types";
import { ChunkPipeline } from "../files/chunk-pipeline";

export interface RecordingTransportSender {
  sendRecordingMessage(msg: unknown): boolean;
}

export type RecordingEventHandler = (event: {
  type: "status_changed" | "consent_requested" | "consent_updated" | "recording_ready" | "error";
  metadata?: RecordingMetadata;
  status?: RecordingStatus;
  consentState?: RecordingConsentState;
  error?: string;
}) => void;

export class ScreenRecorder {
  private sessionId: string;
  private currentUserId: string;
  private currentDeviceId: string;

  private status: RecordingStatus = "REQUESTED";
  private consentState: RecordingConsentState = "PENDING";
  private permissions = new Set<SessionPermission>();
  private activeMetadata: RecordingMetadata | null = null;

  private recordedChunks: Uint8Array[] = [];
  private totalBytes = 0;
  private startTime = 0;
  private stopTime = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private maxDurationMs = 4 * 3600 * 1000; // 4 hours

  private sender: RecordingTransportSender | null = null;
  private handlers = new Set<RecordingEventHandler>();

  constructor(
    sessionId: string,
    currentUserId: string,
    currentDeviceId: string,
    initialPermissions: SessionPermission[] = [],
  ) {
    this.sessionId = sessionId;
    this.currentUserId = currentUserId;
    this.currentDeviceId = currentDeviceId;
    this.setPermissions(initialPermissions);
  }

  public setPermissions(permissions: SessionPermission[]): void {
    this.permissions = new Set(permissions);
  }

  public setSender(sender: RecordingTransportSender | null): void {
    this.sender = sender;
  }

  public onEvent(handler: RecordingEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(event: Parameters<RecordingEventHandler>[0]): void {
    for (const h of this.handlers) {
      try {
        h(event);
      } catch (err) {
        console.error("Error in ScreenRecorder event handler:", err);
      }
    }
  }

  public requestRecording(): boolean {
    if (!this.permissions.has("RECORDING")) {
      this.emit({ type: "error", error: "PERMISSION_DENIED" });
      return false;
    }

    const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.status = "CONSENT_PENDING";
    this.consentState = "PENDING";

    this.activeMetadata = {
      recordingId,
      sessionId: this.sessionId,
      startedByUserId: this.currentUserId,
      startedByDeviceId: this.currentDeviceId,
      status: this.status,
      consentState: this.consentState,
      codec: "H264",
      container: "mp4",
      width: 1920,
      height: 1080,
      fps: 30,
      durationMs: 0,
      fileSize: 0,
      startedAt: Date.now(),
    };

    if (this.sender) {
      this.sender.sendRecordingMessage({
        type: "recording.request",
        recordingId,
        sessionId: this.sessionId,
        requesterUserId: this.currentUserId,
        timestamp: Date.now(),
      });
    }

    this.emit({
      type: "consent_requested",
      metadata: this.activeMetadata,
      status: this.status,
      consentState: this.consentState,
    });
    return true;
  }

  public updateConsent(granted: boolean): boolean {
    if (!this.activeMetadata || this.status !== "CONSENT_PENDING") {
      return false;
    }

    this.consentState = granted ? "GRANTED" : "REJECTED";
    this.activeMetadata.consentState = this.consentState;

    if (this.sender) {
      this.sender.sendRecordingMessage({
        type: "recording.consent",
        recordingId: this.activeMetadata.recordingId,
        sessionId: this.sessionId,
        granted,
        timestamp: Date.now(),
      });
    }

    this.emit({
      type: "consent_updated",
      metadata: this.activeMetadata,
      consentState: this.consentState,
    });

    if (granted) {
      this.startRecordingInternal();
    } else {
      this.status = "CANCELLED";
      this.activeMetadata.status = "CANCELLED";
      this.emit({
        type: "status_changed",
        metadata: this.activeMetadata,
        status: "CANCELLED",
      });
    }

    return true;
  }

  private startRecordingInternal(): void {
    if (this.consentState !== "GRANTED" || !this.activeMetadata) {
      return;
    }

    this.status = "RECORDING";
    this.activeMetadata.status = "RECORDING";
    this.startTime = Date.now();
    this.activeMetadata.startedAt = this.startTime;
    this.recordedChunks = [];
    this.totalBytes = 0;

    // Start duration watchdog
    this.timerInterval = setInterval(() => {
      if (this.activeMetadata && this.status === "RECORDING") {
        const elapsed = Date.now() - this.startTime;
        this.activeMetadata.durationMs = elapsed;
        if (elapsed >= this.maxDurationMs) {
          this.stopRecording();
        }
      }
    }, 1000);

    if (this.sender) {
      this.sender.sendRecordingMessage({
        type: "recording.start",
        recordingId: this.activeMetadata.recordingId,
        sessionId: this.sessionId,
        timestamp: this.startTime,
      });
    }

    this.emit({
      type: "status_changed",
      metadata: this.activeMetadata,
      status: "RECORDING",
    });
  }

  public pushFrameChunk(chunk: Uint8Array): void {
    if (this.status !== "RECORDING" || !this.activeMetadata) {
      return;
    }

    this.recordedChunks.push(chunk);
    this.totalBytes += chunk.length;
    this.activeMetadata.fileSize = this.totalBytes;
  }

  public async stopRecording(): Promise<RecordingMetadata | null> {
    if (this.status !== "RECORDING" || !this.activeMetadata) {
      return null;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.stopTime = Date.now();
    this.status = "PROCESSING";
    this.activeMetadata.status = "PROCESSING";
    this.activeMetadata.stoppedAt = this.stopTime;
    this.activeMetadata.durationMs = Math.max(1000, this.stopTime - this.startTime);

    this.emit({
      type: "status_changed",
      metadata: this.activeMetadata,
      status: "PROCESSING",
    });

    // Assemble payload for SHA-256 calculation
    const combined = new Uint8Array(this.totalBytes);
    let offset = 0;
    for (const chunk of this.recordedChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const sha256 = await ChunkPipeline.computeSha256Hex(combined);
    const storageKey = `recordings/${this.activeMetadata.recordingId}/NexusDesk-${this.sessionId}-${this.activeMetadata.recordingId}.mp4`;

    this.status = "READY";
    this.activeMetadata.status = "READY";
    this.activeMetadata.sha256 = sha256;
    this.activeMetadata.storageKey = storageKey;
    this.activeMetadata.playbackUrl = `/api/v1/recordings/${this.activeMetadata.recordingId}/playback-url`;

    if (this.sender) {
      this.sender.sendRecordingMessage({
        type: "recording.status",
        recordingId: this.activeMetadata.recordingId,
        status: "READY",
        durationMs: this.activeMetadata.durationMs,
        timestamp: Date.now(),
      });
    }

    this.emit({
      type: "recording_ready",
      metadata: this.activeMetadata,
      status: "READY",
    });

    return this.activeMetadata;
  }

  public isRecordingActive(): boolean {
    return this.status === "RECORDING";
  }

  public getStatus(): RecordingStatus {
    return this.status;
  }

  public getConsentState(): RecordingConsentState {
    return this.consentState;
  }

  public getMetadata(): RecordingMetadata | null {
    return this.activeMetadata;
  }

  public cleanup(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.recordedChunks = [];
    this.totalBytes = 0;
  }
}
