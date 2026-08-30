# ADR-030: Input Permission Enforcement & Emergency Local Override

## Status

Accepted

## Context

Remote input allows modifying host system state. The host user must always retain ultimate sovereignty over their local machine.

## Decision

1. **Granular Permission Gating**: `MOUSE_CONTROL` and `KEYBOARD_CONTROL` are separate permissions from `SCREEN_VIEW`. The host user can approve, deny, or revoke them individually during a live session.
2. **Immediate Local Override**: The host UI provides a prominent "STOP REMOTE CONTROL" emergency stop button that immediately disables remote input injection and resets all inputs without closing the screen stream.
3. **No Local User Lockout**: The host operating system's local physical keyboard and mouse remain fully active and can never be disabled by remote peers.
