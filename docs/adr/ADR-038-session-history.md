# ADR-038: Session History, Timeline Correlation & Event-Synchronized Playback

## Status

Accepted

## Context

Post-session auditing and review require a complete, unified chronological timeline correlating disparate actions (session approval, screen capture, chat messages, file transfers, recording intervals, and disconnects) without exposing sensitive credentials or file payloads.

## Decision

1. **Discrete Timeline Events**: High-level lifecycle milestones are captured as `SessionTimelineEvent` records with server timestamps.
2. **Relative Recording Alignment**: Events occurring during active recording are indexed with `relativePlaybackMs` (`eventTime - recordingStartedAt`) to enable interactive playback seek markers.
3. **Privacy Separation**: Timeline metadata references `messageId` and `transferId` without duplicating private file contents or sensitive user inputs.
