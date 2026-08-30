# ADR-055: Production WebRTC TURN Strategy & Relay Protection

## Status
Accepted

## Context
Direct peer-to-peer WebRTC connections cannot always be established across symmetric NATs and strict corporate firewalls. A TURN relay is necessary, but open or unconstrained TURN relays invite severe bandwidth abuse.

## Decision
1. Deploy Coturn configured with `use-auth-secret` and short-lived HMAC time-bound credentials issued per session.
2. Filter out RFC 1918 private subnets and loopback addresses (`denied-peer-ip`) to prevent internal network scanning.
3. Enforce per-session bandwidth throttling (`max-bps=312500` / 2.5 Mbps) and total server capacity quotas.

## Consequences
- Guaranteed fallback connectivity for users behind restrictive networks.
- Comprehensive mitigation of relay bandwidth abuse and unauthorized proxying.
