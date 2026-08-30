# ADR-018: WebRTC Transport Stack & DataChannel Architecture

## Status

Accepted

## Context

NexusDesk AI requires low-latency, encrypted peer-to-peer transport for desktop control channels, real-time telemetry, and future high-framerate screen streaming. The transport must traverse NATs, enforce DTLS-SRTP/SCTP encryption, and provide granular connection state visibility.

## Decision

1. **WebRTC P2P Engine**: Utilize standard W3C WebRTC engine in desktop clients (`RTCPeerConnection`), complemented by native Rust module abstractions in `apps/desktop/src-tauri/src/rtc/`.
2. **Dedicated DataChannels**:
   - `control`: Ordered, reliable SCTP channel for session lifecycle, capabilities, ping/pong latency measurement, and input handshakes.
   - `telemetry`: Unordered, low-latency SCTP channel for continuous RTT, FPS, CPU/RAM, and bandwidth metrics without head-of-line blocking.
3. **Signaling Separation**: WebRTC handles media/data transport only; signaling is strictly isolated to the Phase 2 WebSocket/Redis control plane.

## Consequences

- Guaranteed sub-50ms latency across direct peer connections.
- Native DTLS encryption compliant with enterprise security standards.
