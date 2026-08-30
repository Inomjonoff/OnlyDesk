import { StreamingMetrics, NetworkDegradationState, VideoCodec } from "@nexusdesk/types";

export type StreamingEventHandler = (event: { type: string; data: unknown }) => void;

export class StreamingController {
  private targetBitrateKbps = 5000;
  private readonly minBitrateKbps = 1500;
  private readonly maxBitrateKbps = 8500;

  private targetFps = 30;
  private codec: VideoCodec = "H264";
  private networkState: NetworkDegradationState = "STABLE";

  private lastAdjustmentTime = Date.now();
  private readonly hysteresisCooldownMs = 3000;

  private keyframeRequestCount = 0;
  private framesDropped = 0;
  private handlers = new Map<string, Set<StreamingEventHandler>>();

  public evaluateNetwork(rttMs: number, packetLossPercent: number): void {
    const now = Date.now();
    const canAdjust = now - this.lastAdjustmentTime >= this.hysteresisCooldownMs;

    // Detect degradation state
    if (packetLossPercent > 5 || rttMs > 200) {
      this.networkState = "SEVERELY_DEGRADED";
      if (canAdjust) {
        this.targetBitrateKbps = Math.max(
          this.minBitrateKbps,
          Math.floor(this.targetBitrateKbps * 0.7),
        );
        this.targetFps = 15;
        this.lastAdjustmentTime = now;
        this.emit("adaptation", {
          bitrateKbps: this.targetBitrateKbps,
          fps: this.targetFps,
          state: this.networkState,
        });
      }
    } else if (packetLossPercent > 2 || rttMs > 100) {
      this.networkState = "DEGRADED";
      if (canAdjust) {
        this.targetBitrateKbps = Math.max(
          this.minBitrateKbps,
          Math.floor(this.targetBitrateKbps * 0.85),
        );
        this.targetFps = 20;
        this.lastAdjustmentTime = now;
        this.emit("adaptation", {
          bitrateKbps: this.targetBitrateKbps,
          fps: this.targetFps,
          state: this.networkState,
        });
      }
    } else {
      // Stable or Recovering
      if (this.networkState === "SEVERELY_DEGRADED" || this.networkState === "DEGRADED") {
        this.networkState = "RECOVERING";
      } else {
        this.networkState = "STABLE";
      }

      if (canAdjust && this.targetBitrateKbps < this.maxBitrateKbps) {
        this.targetBitrateKbps = Math.min(this.maxBitrateKbps, this.targetBitrateKbps + 500);
        this.targetFps = 30;
        this.lastAdjustmentTime = now;
        this.emit("adaptation", {
          bitrateKbps: this.targetBitrateKbps,
          fps: this.targetFps,
          state: this.networkState,
        });
      }
    }
  }

  public requestKeyframe(): void {
    this.keyframeRequestCount++;
    this.emit("keyframe_request", { count: this.keyframeRequestCount, timestamp: Date.now() });
  }

  public recordDroppedFrame(): void {
    this.framesDropped++;
  }

  public getMetrics(width = 1920, height = 1080, rttMs = 15): StreamingMetrics {
    return {
      captureFps: this.targetFps,
      encodeFps: this.targetFps,
      sendFps: this.targetFps,
      receiveFps: this.targetFps,
      renderFps: this.targetFps,
      bitrateKbps: this.targetBitrateKbps,
      width,
      height,
      codec: this.codec,
      keyframes: this.keyframeRequestCount,
      framesDropped: this.framesDropped,
      rttMs,
    };
  }

  public getNetworkState(): NetworkDegradationState {
    return this.networkState;
  }

  public getTargetBitrate(): number {
    return this.targetBitrateKbps;
  }

  public getTargetFps(): number {
    return this.targetFps;
  }

  public on(event: string, handler: StreamingEventHandler): () => void {
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
