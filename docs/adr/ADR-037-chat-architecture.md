# ADR-037: In-Session Chat Architecture, DataChannel Transport & REST Synchronization

## Status

Accepted

## Context

Remote desktop assistance requires fast, interactive text communication between the host and remote operator. Chat traffic must not interfere with real-time video frames, input injection, or bulk file transfers, and must persist across temporary network disruptions.

## Decision

1. **Dedicated Chat DataChannel**: Chat messages are transported peer-to-peer over an isolated WebRTC DataChannel (`chat`, `ordered: true, reliable: true`).
2. **Deterministic Sequence & Idempotency**: Each message includes a unique `messageId` and session-scoped sequence number to eliminate duplicates.
3. **Payload Bounds & Sanitization**: Messages are limited to 16 KiB plain text; raw HTML / script execution is strictly forbidden.
4. **REST Persistence & Offline Reconnection**: Messages are asynchronously synchronized with PostgreSQL via `/api/v1/sessions/:id/messages` to ensure persistent history and cursor-based pagination.
