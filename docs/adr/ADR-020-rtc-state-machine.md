# ADR-020: WebRTC Multi-Layer State Machine

## Status

Accepted

## Context

A WebRTC connection involves multiple asynchronous sub-layers: high-level session status, peer connection state, ICE gathering/connection state, and individual DataChannel open states. Collapsing these into a single string causes ambiguity and race conditions.

## Decision

We enforce decoupled, multi-layer state tracking:

1. `RemoteSession.status`: `NEGOTIATING` ──→ `READY_FOR_WEBRTC` ──→ `ENDED`.
2. `RTCConnectionState`: `NEW` ──→ `CONNECTING` ──→ `CONNECTED` ──→ `DISCONNECTED` / `FAILED` ──→ `CLOSED`.
3. `ICEConnectionState`: `NEW` ──→ `CHECKING` ──→ `CONNECTED` ──→ `COMPLETED` ──→ `FAILED` ──→ `CLOSED`.
4. `DataChannelState`: `CONNECTING` ──→ `OPEN` ──→ `CLOSING` ──→ `CLOSED`.

A session is officially considered live only when `RTCPeerConnection.connectionState === 'CONNECTED'` and `DataChannel.readyState === 'open'`.
