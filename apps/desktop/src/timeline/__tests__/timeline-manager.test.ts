import { describe, it, expect } from "vitest";
import { TimelineManager } from "../timeline-manager";

describe("Phase 7: TimelineManager Event Correlation & Playback Alignment Tests", () => {
  it("records and chronologically sorts session events", () => {
    const manager = new TimelineManager("ses_test_1", 1000);

    manager.recordEvent("SESSION_CREATED", "Session Started", { timestamp: 1000 });
    manager.recordEvent("SESSION_APPROVED", "Host Approved Connection", { timestamp: 1005 });
    manager.recordEvent("SCREEN_STARTED", "Screen Stream Live", { timestamp: 1010 });
    manager.recordEvent("CHAT_MESSAGE", "User sent message", { timestamp: 1015 });

    const events = manager.getEvents();
    expect(events.length).toBe(4);
    expect(events[0]?.type).toBe("SESSION_CREATED");
    expect(events[3]?.type).toBe("CHAT_MESSAGE");
  });

  it("calculates relative playback offsets for events during active recording", () => {
    const manager = new TimelineManager("ses_test_1", 1000);
    manager.setRecordingStartTime(2000);

    manager.recordEvent("SESSION_CREATED", "Session Started", { timestamp: 1000 });
    manager.recordEvent("RECORDING_STARTED", "Recording Started", { timestamp: 2000 });
    manager.recordEvent("CHAT_MESSAGE", "In-recording chat", { timestamp: 2500 });
    manager.recordEvent("FILE_STARTED", "File Upload", { timestamp: 3200 });

    const playbackEvents = manager.getEventsForPlayback();
    expect(playbackEvents.length).toBe(3); // 2000, 2500, 3200

    expect(playbackEvents[0]?.relativePlaybackMs).toBe(0);
    expect(playbackEvents[1]?.relativePlaybackMs).toBe(500);
    expect(playbackEvents[2]?.relativePlaybackMs).toBe(1200);
  });

  it("computes accurate session summary statistics", () => {
    const manager = new TimelineManager("ses_test_1", 1000);

    manager.recordEvent("CHAT_MESSAGE", "Msg 1");
    manager.recordEvent("CHAT_MESSAGE", "Msg 2");
    manager.recordEvent("FILE_STARTED", "File upload");
    manager.recordEvent("RECORDING_STARTED", "Rec 1");

    const summary = manager.getSummary();
    expect(summary.totalEvents).toBe(4);
    expect(summary.chatCount).toBe(2);
    expect(summary.fileCount).toBe(1);
    expect(summary.recordingCount).toBe(1);
  });
});
