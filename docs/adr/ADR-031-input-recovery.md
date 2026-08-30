# ADR-031: Stuck-Key Protection, Input Watchdog & Clean State Recovery

## Status

Accepted

## Context

If a network partition or disconnect occurs while a remote user is holding down a key (such as `Shift` or `Ctrl`) or mouse button, the host OS may leave the key in a pressed state, causing disruptive behavior for the local user.

## Decision

1. **Host-Side Key State Tracking**: The host tracks all currently pressed mouse buttons and keyboard keys in memory.
2. **Input Watchdog**: If buttons or keys remain active with no incoming packets for 5 seconds, an inactivity watchdog triggers `release_all()`.
3. **Mandatory Disconnect Teardown**: Upon session end, WebRTC disconnect, permission revocation, or device revocation, `release_all()` is executed unconditionally.
