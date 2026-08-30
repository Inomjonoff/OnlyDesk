# ADR-063: Session Invitation Tokens & Link Flow

## Status
Accepted

## Context
Connecting two participants should be as simple as sharing a secure link, without requiring permanent passwords or exposing device authorization keys.

## Decision
1. Implement single-use, 15-minute expiring session invitation links (`/connect/<token>`).
2. Require the host machine to explicitly review requested capabilities (Screen, Mouse, Files, AI) and click Accept prior to WebRTC peer establishment.
3. Invalidate invite tokens immediately upon first consumption (`HTTP 410 Gone` on subsequent attempts).

## Consequences
- Frictionless invite-link sharing for ad-hoc remote support.
- Zero risk of replay attacks or unauthorized permanent access links.
