import { describe, it, expect } from "vitest";
import { ScreenCaptureManager } from "../screen-capture-manager";

describe("Phase 4: ScreenCaptureManager Integration Tests", () => {
  it("enumerates connected displays with resolution and scale metrics", async () => {
    const mgr = new ScreenCaptureManager();
    const displays = await mgr.enumerateDisplays();

    expect(displays.length).toBeGreaterThanOrEqual(1);
    const primary = displays[0]!;
    expect(primary.id).toBe("display_primary");
    expect(primary.width).toBeGreaterThan(0);
    expect(primary.height).toBeGreaterThan(0);
    expect(primary.primary).toBe(true);
  });

  it("manages capture state machine transitions strictly", async () => {
    const mgr = new ScreenCaptureManager();
    expect(mgr.getState()).toBe("STOPPED");

    // Start capture
    await mgr.startCapture("display_primary", { maxFps: 30 });
    expect(mgr.getState()).toBe("RUNNING");

    // Pause capture
    mgr.pauseCapture();
    expect(mgr.getState()).toBe("PAUSED");

    // Resume capture
    mgr.resumeCapture();
    expect(mgr.getState()).toBe("RUNNING");

    // Stop capture
    mgr.stopCapture();
    expect(mgr.getState()).toBe("STOPPED");
  });

  it("rejects illegal state transitions", async () => {
    const mgr = new ScreenCaptureManager();
    expect(mgr.getState()).toBe("STOPPED");

    // Attempting to pause when STOPPED should not transition to PAUSED
    mgr.pauseCapture();
    expect(mgr.getState()).toBe("STOPPED");
  });

  it("provides metrics for live capture stream", async () => {
    const mgr = new ScreenCaptureManager();
    await mgr.startCapture("display_primary", { maxFps: 30, maxWidth: 1920, maxHeight: 1080 });

    const metrics = mgr.getMetrics();
    expect(metrics.isCapturing).toBe(true);
    expect(metrics.captureFps).toBe(30);
    expect(metrics.width).toBe(1920);
    expect(metrics.height).toBe(1080);

    mgr.stopCapture();
  });
});
