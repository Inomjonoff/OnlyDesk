# ADR-016: Redis Pub/Sub Multi-Node Signaling

## Status

Accepted

## Context

In production deployments with multiple signaling instances (e.g. `node-1`, `node-2`), Client A connected to `node-1` must reliably reach Target B connected to `node-2`.

## Decision

We utilize Redis Pub/Sub channels namespaced by target entity:

- `nxdesk:signaling:user:{userId}`: User-wide notifications and alerts.
- `nxdesk:signaling:device:{deviceId}`: Machine-specific connection requests and commands.
- `nxdesk:signaling:session:{sessionId}`: Session-scoped signaling messages (WebRTC SDP offers, answers, ICE candidates).

Centralized routing helpers (`routeToUser`, `routeToDevice`, `routeToSession`) transparently publish across Redis and dispatch to locally connected sockets.

## Consequences

Signaling nodes remain stateless and horizontally scalable.
