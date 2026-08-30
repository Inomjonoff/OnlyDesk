import { describe, it, expect } from "vitest";
import { ScreenRecorder } from "../screen-recorder";

describe("Phase 7: ScreenRecorder Engine Tests", () => {
  it("enforces RECORDING permission before requesting recording", () => {
    const recorder = new ScreenRecorder("ses_test_1", "usr_1", "dev_1", []);
    const requested = recorder.requestRecording();
    expect(requested).toBe(false);

    recorder.setPermissions(["RECORDING"]);
    const requested2 = recorder.requestRecording();
    expect(requested2).toBe(true);
    expect(recorder.getStatus()).toBe("CONSENT_PENDING");
  });

  it("handles host consent rejection by transitioning to CANCELLED", () => {
    const recorder = new ScreenRecorder("ses_test_1", "usr_1", "dev_1", ["RECORDING"]);
    recorder.requestRecording();

    recorder.updateConsent(false);
    expect(recorder.getConsentState()).toBe("REJECTED");
    expect(recorder.getStatus()).toBe("CANCELLED");
    expect(recorder.isRecordingActive()).toBe(false);
  });

  it("completes full recording lifecycle with frame chunks and SHA-256 calculation upon host consent", async () => {
    const recorder = new ScreenRecorder("ses_test_1", "usr_1", "dev_1", ["RECORDING"]);
    recorder.requestRecording();

    recorder.updateConsent(true);
    expect(recorder.getConsentState()).toBe("GRANTED");
    expect(recorder.getStatus()).toBe("RECORDING");
    expect(recorder.isRecordingActive()).toBe(true);

    // Push simulated video frame chunks (3 chunks of 1024 bytes)
    const chunk1 = new Uint8Array(1024).fill(1);
    const chunk2 = new Uint8Array(1024).fill(2);
    const chunk3 = new Uint8Array(1024).fill(3);

    recorder.pushFrameChunk(chunk1);
    recorder.pushFrameChunk(chunk2);
    recorder.pushFrameChunk(chunk3);

    const metadata = await recorder.stopRecording();
    expect(metadata).not.toBeNull();
    expect(metadata?.status).toBe("READY");
    expect(metadata?.fileSize).toBe(3072);
    expect(metadata?.sha256).toBeDefined();
    expect(metadata?.sha256?.length).toBe(64);
    expect(metadata?.playbackUrl).toBeDefined();
    expect(recorder.isRecordingActive()).toBe(false);

    recorder.cleanup();
  });
});
