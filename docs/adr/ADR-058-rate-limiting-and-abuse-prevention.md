# ADR-058: Rate Limiting & Abuse Prevention

## Status
Accepted

## Context
Public-facing demo endpoints are susceptible to brute force attacks on authentication, connection storms on WebSockets, and excessive AI token usage.

## Decision
We enforce multi-tiered rate limiting:
1. **HTTP API**: 100 requests/minute per IP with `@fastify/rate-limit`, and 5 requests/minute per IP for `/api/v1/auth/login`.
2. **Session Creation**: 10 sessions/minute per account (`PRODUCTION_CONFIG.SESSION_RATE_LIMIT_PER_MIN`).
3. **AI Copilot**: 20 requests/minute global cap, 50 queries/day per demo account (`DEMO_QUOTAS.DAILY_AI_REQUESTS_PER_USER`).
4. **Relay Bandwidth**: Hard cap of 2.5 Mbps per session in Coturn.

## Consequences
- Protects API, signaling, and AI services from Denial of Service (DoS) and cost overruns.
- Fair distribution of resources across all demo evaluators.
