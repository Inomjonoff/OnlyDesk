# ADR-027: Remote Input Injection Architecture & DataChannel Routing

## Status

Accepted

## Context

NexusDesk AI requires low-latency, responsive mouse and keyboard input control between remote viewer endpoints and host desktop machines. Input packets must not route through centralized application servers.

## Decision

1. **Direct WebRTC DataChannel Routing**: Input packets flow directly peer-to-peer over the established WebRTC DataChannel.
2. **Prioritized Ingestion**: Critical button downs/ups and key downs/ups are transmitted immediately on ordered streams; high-frequency mouse moves are coalesced at 60-120 Hz to prevent channel backpressure.
3. **Host-Side Enforcement**: The host independently enforces permission validation, sequence validation, token-bucket rate limits, and native OS injection.
