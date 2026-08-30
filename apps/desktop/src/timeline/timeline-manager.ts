import { SessionTimelineEvent, SessionTimelineEventType } from "@nexusdesk/types";

export class TimelineManager {
  private sessionId: string;
  private events: SessionTimelineEvent[] = [];
  private recordingStartTime: number | null = null;
  private sessionStartTime: number;

  constructor(sessionId: string, sessionStartTime: number = Date.now()) {
    this.sessionId = sessionId;
    this.sessionStartTime = sessionStartTime;
  }

  public setRecordingStartTime(timestamp: number | null): void {
    this.recordingStartTime = timestamp;
  }

  public recordEvent(
    type: SessionTimelineEventType,
    title: string,
    options: {
      description?: string;
      actor?: string;
      timestamp?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): SessionTimelineEvent {
    const timestamp = options.timestamp ?? Date.now();
    const eventId = `ev_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

    let relativePlaybackMs: number | undefined;
    if (this.recordingStartTime && timestamp >= this.recordingStartTime) {
      relativePlaybackMs = timestamp - this.recordingStartTime;
    }

    const event: SessionTimelineEvent = {
      eventId,
      sessionId: this.sessionId,
      type,
      title,
      description: options.description,
      actor: options.actor,
      timestamp,
      relativePlaybackMs,
      metadata: options.metadata,
    };

    this.events.push(event);
    return event;
  }

  public getEvents(): SessionTimelineEvent[] {
    return [...this.events].sort((a, b) => a.timestamp - b.timestamp);
  }

  public getEventsForPlayback(): SessionTimelineEvent[] {
    return this.events
      .filter((e) => e.relativePlaybackMs !== undefined)
      .sort((a, b) => (a.relativePlaybackMs ?? 0) - (b.relativePlaybackMs ?? 0));
  }

  public getSummary(): {
    totalEvents: number;
    durationMs: number;
    chatCount: number;
    fileCount: number;
    recordingCount: number;
  } {
    const now = Date.now();
    const durationMs = Math.max(0, now - this.sessionStartTime);
    let chatCount = 0;
    let fileCount = 0;
    let recordingCount = 0;

    for (const e of this.events) {
      if (e.type === "CHAT_MESSAGE") chatCount++;
      else if (e.type === "FILE_STARTED" || e.type === "FILE_COMPLETED") fileCount++;
      else if (e.type === "RECORDING_STARTED" || e.type === "RECORDING_STOPPED") recordingCount++;
    }

    return {
      totalEvents: this.events.length,
      durationMs,
      chatCount,
      fileCount,
      recordingCount,
    };
  }

  public clear(): void {
    this.events = [];
    this.recordingStartTime = null;
  }
}
