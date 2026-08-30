# ADR-052: Free Demo Capacity & Quotas

## Status
Accepted

## Context
To offer an open, public demonstration of NexusDesk AI without incurring unbounded cloud infrastructure expenses or risking denial-of-service abuse, strict capacity boundaries must be enforced.

## Decision
We enforce explicit free demo quotas (`DEMO_QUOTAS` in `@nexusdesk/config`):
- Maximum 100 registered demo accounts.
- Maximum 10 concurrent active WebRTC remote sessions.
- Maximum 30-minute session duration (graceful teardown notification at 25 minutes).
- Maximum 100MB file transfer per transfer.
- Maximum 15-minute recording limit.
- Maximum 50 AI queries per user per day.
- Bandwidth capped at 2.5 Mbps per session.

## Consequences
- Protects free tier cloud resources from starvation.
- Provides a stable, high-performance experience for evaluators.
