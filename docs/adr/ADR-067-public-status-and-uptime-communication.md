# ADR-067: Public Status & Uptime Communication

## Status
Accepted

## Context
Transparency regarding system availability is critical for establishing user trust during public beta operations.

## Decision
1. Publish an unauthenticated public status dashboard at `/status` reporting real-time operational status for Web, API, Signaling, TURN Relays, AI, and Storage.
2. Report measured latency and uptime statistics updated continuously from backend health probes.
3. Keep the status page decoupled from central database state to ensure it remains accessible even during localized service degradations.

## Consequences
- Immediate visibility for evaluators and technicians during planned maintenance or unexpected outages.
