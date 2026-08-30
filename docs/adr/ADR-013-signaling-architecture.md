# ADR-013: Signaling Architecture

## Status

Accepted

## Context

NexusDesk AI requires a low-latency, stateful signaling and control plane to discover peers, initiate remote connection requests, negotiate capabilities, obtain user approvals, and coordinate WebRTC peer connections across distributed nodes.

## Decision

We adopted a dual-layer architecture:

1. **Persistent State Plane**: PostgreSQL for durable session audit records, device registration, and user accounts.
2. **Ephemeral Control Plane**: Fastify WebSocket server paired with Redis Pub/Sub for sub-100ms real-time message distribution across multi-node clusters.
3. **Transport Layer**: Strongly typed, versioned JSON event envelopes (`SignalingEventEnvelope`, version 1) with monotonic sequence numbers and unique event IDs.

## Consequences

- **Positive**: Clean separation of durable transactional state and high-frequency ephemeral signaling; horizontal scalability across multiple signaling instances via Redis channels.
- **Negative**: Requires Redis infrastructure in production deployments (with automatic single-node in-memory fallback for local development and lightweight environments).

## Security Implications

All WebSocket connections must be authenticated before any message dispatching occurs. Peer authorization is strictly validated on each state mutation.
