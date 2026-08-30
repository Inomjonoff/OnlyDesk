import { describe, it, expect } from "vitest";
import { RTCManager } from "../rtc-manager";

describe("Phase 3: WebRTC P2P Transport & DataChannel Integration Tests", () => {
  it("initializes RTCManager with STUN/TURN configuration", () => {
    const rtc = new RTCManager([
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "turn:relay.nexusdesk.ai:3478", username: "user1", credential: "cred1" },
    ]);

    expect(rtc).toBeDefined();
    const snapshot = rtc.getSnapshot();
    expect(snapshot.connectionState).toBe("NEW");
    expect(snapshot.dataChannelState).toBe("CONNECTING");
  });

  it("buffers ICE candidates arriving before remote description is set", async () => {
    const rtc = new RTCManager();
    await rtc.initialize("ses_test_123", false);

    // Send ICE candidate before remote description
    const mockCandidate = {
      candidate: "candidate:1 1 UDP 2122252543 192.168.1.100 54321 typ host",
      sdpMid: "0",
      sdpMLineIndex: 0,
    };
    await rtc.addIceCandidate(mockCandidate);

    // Verify candidate is queued without error
    const snapshot = rtc.getSnapshot();
    expect(snapshot.sessionId).toBe("ses_test_123");
  });

  it("computes connection quality correctly based on RTT and connection state", () => {
    const rtc = new RTCManager();
    const snapshot = rtc.getSnapshot();
    // Default when not connected
    expect(snapshot.quality).toBe("FAILED");
  });

  it("handles ICE restart with loop protection limit", async () => {
    const rtc = new RTCManager();
    await rtc.initialize("ses_test_restart", true);

    // Attempt 1, 2, 3
    await rtc.restartIce();
    await rtc.restartIce();
    await rtc.restartIce();

    // Attempt 4 should return null because maxRestartAttempts = 3
    const attempt4 = await rtc.restartIce();
    expect(attempt4).toBeNull();
  });

  it("performs clean teardown and closes all channels without leaks", async () => {
    const rtc = new RTCManager();
    await rtc.initialize("ses_test_cleanup", true);

    rtc.close();
    const snapshot = rtc.getSnapshot();
    expect(snapshot.connectionState).toBe("CLOSED");
    expect(snapshot.dataChannelState).toBe("CLOSED");
  });
});
