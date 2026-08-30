# ADR-032: Dedicated WebRTC DataChannel File Transport & Direct P2P Streaming

## Status

Accepted

## Context

Bulk file transfer requires high throughput, reliability, and ordering. However, sending large file chunks through centralized API servers creates heavy bandwidth costs and privacy vulnerabilities, while sharing the `control` DataChannel can cause head-of-line blocking for critical mouse/keyboard and session control packets.

## Decision

1. **Dedicated DataChannel**: File transfer runs exclusively over a dedicated `file` WebRTC DataChannel configured with `ordered: true, reliable: true`.
2. **Strict Direct P2P Data Plane**: Zero file bytes are transmitted through the API server or stored in PostgreSQL.
3. **Channel Isolation**: File streaming yields bandwidth to `control`, `input`, and `clipboard` channels under network congestion.
