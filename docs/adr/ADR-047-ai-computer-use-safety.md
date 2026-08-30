# ADR-047: AI Computer Use Safety and Control Leases

## Status

Accepted

## Context

AI-assisted GUI interactions (clicks, keyboard input, scrolling) carry risks of uncontrolled loops, sensitive data entry, and runaway UI navigation.

## Decision

We implemented computer-use safety primitives in `ComputerUseTool`:

1. **Dedicated Permission**: Requires `AI_COMPUTER_USE` permission separate from human mouse/keyboard controls.
2. **Short-Lived Control Leases**: Actions must be executed within a temporary `AiControlLease` limited to at most 5 discrete steps and a 30-second expiry per approval.
3. **Coordinate Bounds**: Reuses Phase 5 `CoordinateMapper` with strict `[0.0, 1.0]` normalized boundary enforcement.
4. **Sensitive Input Gating**: Detects password/secret input attempts and immediately aborts.
5. **Emergency Stop**: Dedicated "STOP AI" button that halts all leases immediately.

## Consequences

Enables safe, bounded GUI interactions without risk of unmonitored automation.
