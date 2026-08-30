# ADR-039: Native Screen Stream Recording Architecture & Frame Pipeline

## Status

Accepted

## Context

Recording remote desktop sessions is vital for compliance, training, and security auditing. Recording must capture the clean, native desktop video stream directly from the capture pipeline rather than the scaled/letterboxed viewer UI surface.

## Decision

1. **Direct Stream Recording**: Video frames are captured directly from the native desktop capture/encoder pipeline in H.264/MP4 format.
2. **Resource Isolation**: Encoding for recording operates with bounded buffer allocations to avoid degrading live WebRTC streaming latency or remote input responsiveness.
3. **No Audio in Phase 7**: Video-only recording is enforced; microphone and system audio capture are explicitly omitted until dedicated audio phases.
