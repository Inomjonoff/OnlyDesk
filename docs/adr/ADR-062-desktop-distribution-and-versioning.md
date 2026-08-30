# ADR-062: Desktop Distribution & Version Compatibility

## Status
Accepted

## Context
Desktop clients and the cloud control plane may evolve asynchronously. Outdated desktop clients must be cleanly detected and handled without cryptic socket errors.

## Decision
1. Expose version checks via `/api/v1/version` and `/api/v1/version/check`.
2. Package official Windows x64 `.exe` installer releases with published SHA-256 integrity checksums.
3. Explicitly state "Unsigned Public Beta" status to prevent misleading trust claims while signing certificates are pending.

## Consequences
- Guaranteed protocol compatibility between desktop clients and signaling servers.
- Clear update notifications presented to users when breaking protocol revisions occur.
