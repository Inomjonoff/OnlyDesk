# ADR-019: Ephemeral TURN Credentials & NAT Traversal

## Status

Accepted

## Context

When symmetric NATs, enterprise firewalls, or carrier-grade NATs prevent direct P2P connectivity, peers must fall back to TURN relay. Hardcoding permanent credentials in client executables exposes relays to bandwidth abuse and credential theft.

## Decision

1. **Server-Controlled Credentials**: The API server exposes `GET /api/v1/sessions/:id/rtc/config`, accessible only by authorized session participants.
2. **Session-Scoped Ephemeral Credentials**: Generates dynamic username/credential pairs bound strictly to `sessionId` with short expiration (1 hour TTL).
3. **Dual Transport Policy**: Default is `iceTransportPolicy: "all"` for direct P2P optimization with automatic TURN relay fallback.

## Security Implications

- Prevents unauthenticated relay usage.
- Terminating a session immediately revokes further relay authorization.
