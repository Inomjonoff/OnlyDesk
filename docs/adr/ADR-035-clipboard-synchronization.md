# ADR-035: Bidirectional Clipboard Synchronization & Loop Prevention Architecture

## Status

Accepted

## Context

Synchronizing clipboards between two machines can trigger infinite feedback loops (A copies $\to$ B applies $\to$ B triggers change $\to$ A applies $\to \dots$), and unbounded clipboard data could cause denial-of-service.

## Decision

1. **Loop Prevention Protocol**: Each clipboard event includes `originDeviceId`, a unique `clipboardId`, and content SHA-256 hash. When a device applies remote clipboard content, it marks the hash as remote-originated to prevent rebroadcasting.
2. **Payload Boundaries**: Plain text is limited to 1 MiB (UTF-8); images are limited to 10 MiB (PNG normalized).
3. **Permission Gating**: `CLIPBOARD_READ` and `CLIPBOARD_WRITE` are independently enforced.
4. **Privacy**: Keystroke/clipboard contents are never persisted to disk or sent to server audit logs.
