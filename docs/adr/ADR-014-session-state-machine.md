# ADR-014: Session State Machine

## Status

Accepted

## Context

Remote sessions transition through multiple phases: initiation, user consent, capability negotiation, WebRTC establishment, and termination. Without an explicit, centralized state machine, concurrent actions (e.g. approve vs reject vs expire) can lead to race conditions and illegal transitions.

## Decision

We implemented a strict, non-cyclical state machine defined by:

```text
CREATED ──→ WAITING_FOR_APPROVAL ──┬──→ APPROVED ──→ NEGOTIATING ──→ READY_FOR_WEBRTC ──→ ENDED
                                   ├──→ REJECTED
                                   ├──→ CANCELLED
                                   └──→ EXPIRED
```

- A centralized validator `canTransition(from, to)` rejects any illegal jumps (e.g., `REJECTED` -> `APPROVED`).
- Atomic state updates check the expected previous status before transitioning.
- Terminal states (`REJECTED`, `CANCELLED`, `EXPIRED`, `ENDED`) are permanently immutable.

## Consequences

- Guaranteed deterministic behavior in concurrent environments.
- High visibility into the exact lifecycle state of every remote session.
