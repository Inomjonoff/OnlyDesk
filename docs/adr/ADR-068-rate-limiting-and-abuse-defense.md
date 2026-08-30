# ADR-068: Rate Limiting & Abuse Defense in Public Beta

## Status
Accepted

## Context
Opening a public beta requires strict abuse controls to prevent spam session requests, brute force attacks, and exhaustion of cloud AI tokens.

## Decision
1. Rate limit login attempts (5/min per IP) and session creation requests (10/min per account).
2. Cap free demo AI requests at 50 queries/user/day (`DEMO_QUOTAS.DAILY_AI_REQUESTS_PER_USER`).
3. Set hard session duration limits (30 minutes max) with automatic graceful teardown warnings.
4. Restrict TURN relay bandwidth to 2.5 Mbps per session to prevent high-bandwidth proxy abuse.

## Consequences
- Fair resource allocation across all beta evaluators.
- Protection against rogue automated attacks or resource starvation.
