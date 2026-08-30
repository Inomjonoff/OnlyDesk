# ADR-022: Windows Native Screen Capture Architecture

## Status

Accepted

## Context

NexusDesk AI requires low-latency, GPU-accelerated desktop capture on Windows 10/11 x64 systems with multi-monitor enumeration and cursor composition.

## Decision

1. **Windows Native Capture**: Target Windows Desktop Duplication API (DXGI) and Windows Graphics Capture (WGC).
2. **Display Enumeration**: Provide explicit display enumeration allowing the host user to select the specific active monitor to share.
3. **Capture State Machine**: Enforce strict lifecycle transitions (`STOPPED` -> `STARTING` -> `RUNNING` -> `PAUSED` -> `STOPPING` -> `STOPPED`), rejecting illegal transitions.

## Consequences

- Guaranteed sub-frame capture latency.
- Full compliance with Windows desktop security and GPU composition pipelines.
