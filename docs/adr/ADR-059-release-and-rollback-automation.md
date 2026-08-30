# ADR-059: Release & Rollback Automation

## Status
Accepted

## Context
Deploying updates to production requires rigorous pre-flight verification, atomic schema updates, and zero-downtime rollback capabilities.

## Decision
1. Implement `scripts/release.ts` running 5 automated quality gates:
   - Secret scan validation (`scripts/scan-secrets.ts`)
   - Full TypeScript typecheck across all 13 monorepo packages
   - Execution of unit & integration test suites
   - Database schema migration verification
   - Health endpoint probe check
2. Implement `scripts/rollback.ts` to seamlessly revert container image tags and traffic routing to the prior stable release tag upon detected anomalies.

## Consequences
- Reliable, repeatable deployments with zero manual guesswork.
- Fast, automated recovery from failed deployments.
