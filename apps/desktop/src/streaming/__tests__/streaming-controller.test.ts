import { describe, it, expect } from "vitest";
import { StreamingController } from "../streaming-controller";

describe("Phase 4: StreamingController Adaptive Bitrate & Quality Tests", () => {
  it("initializes with default balanced bitrate and FPS", () => {
    const ctrl = new StreamingController();
    expect(ctrl.getTargetBitrate()).toBe(5000);
    expect(ctrl.getTargetFps()).toBe(30);
    expect(ctrl.getNetworkState()).toBe("STABLE");
  });

  it("triggers keyframe requests and increments sequence count", () => {
    const ctrl = new StreamingController();
    let keyframeEventFired = false;

    ctrl.on("keyframe_request", (e) => {
      keyframeEventFired = true;
      const data = e.data as { count: number };
      expect(data.count).toBe(1);
    });

    ctrl.requestKeyframe();
    expect(keyframeEventFired).toBe(true);

    const metrics = ctrl.getMetrics();
    expect(metrics.keyframes).toBe(1);
  });

  it("handles network degradation under packet loss gracefully", () => {
    const ctrl = new StreamingController();

    // Simulate severe loss (10% packet loss, 250ms RTT)
    ctrl.evaluateNetwork(250, 10);
    expect(ctrl.getNetworkState()).toBe("SEVERELY_DEGRADED");

    // Bitrate should adjust downwards
    const metrics = ctrl.getMetrics();
    expect(metrics.bitrateKbps).toBeLessThanOrEqual(5000);
  });

  it("tracks dropped frames accurately", () => {
    const ctrl = new StreamingController();
    ctrl.recordDroppedFrame();
    ctrl.recordDroppedFrame();

    const metrics = ctrl.getMetrics();
    expect(metrics.framesDropped).toBe(2);
  });
});
