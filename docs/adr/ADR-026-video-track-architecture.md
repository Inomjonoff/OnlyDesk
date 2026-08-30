# ADR-026: WebRTC Video Track Lifecycle & Viewer Surface

## Status

Accepted

## Context

Video tracks must integrate cleanly with the Phase 3 WebRTC transport and Phase 2 signaling plane without leaking background capture or encoder threads upon disconnect.

## Decision

1. **Integrated Video Transceivers**: Video tracks are attached via `RTCPeerConnection.addTrack` and renegotiated using Phase 2 signaling `rtc.offer` / `rtc.answer`.
2. **Interactive Remote Viewer**: The viewer renders the live incoming stream on a hardware-accelerated video/canvas surface supporting aspect-ratio preserving modes (`contain`, `cover`, `fit`, `100%`) and fullscreen presentation.
3. **Strict Resource Teardown**: Closing or cancelling a session immediately halts native screen capture loops, removes video transceivers, and resets all UI metrics.
