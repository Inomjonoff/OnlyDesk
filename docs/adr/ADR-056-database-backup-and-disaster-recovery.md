# ADR-056: Database Backup & Disaster Recovery

## Status
Accepted

## Context
PostgreSQL stores authoritative identity, device enrollment keys, audit trails, and session permission records. Automated backup and verifiable restore processes are essential.

## Decision
1. Daily automated snapshot generation via `scripts/backup-db.ts` storing timestamped dumps in compressed storage.
2. Mandatory restore test verification script (`scripts/restore-db.ts`) ensuring backup files can be parsed, restored, and validated.
3. Decouple ephemeral Redis caching from core PostgreSQL transactions so Redis failures never compromise persistent session authorization.

## Consequences
- Guaranteed data survivability and fast Recovery Time Objective (RTO < 5 minutes).
- Verified recovery procedure documented in `docs/backup-restore.md`.
