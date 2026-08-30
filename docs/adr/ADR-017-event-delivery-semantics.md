# ADR-017: Event Delivery Semantics & Idempotency

## Status

Accepted

## Context

Network fluctuations, reconnections, and multi-node event fanout can cause duplicate event delivery or out-of-order packet arrival.

## Decision

1. **At-Least-Once Delivery**: The signaling service ensures delivery of session lifecycle events to all active participants.
2. **Global Event Identifiers**: Every signaling event carries a cryptographically random `eventId` (`evt_...`) and timestamp.
3. **Idempotent Client Processing**: Clients ignore duplicate `eventId` receipts and ignore duplicate state transitions.
4. **Authoritative State Resynchronization**: Upon reconnecting after a dropped connection, clients query `GET /api/v1/sessions/:id` to recover the canonical server state.
