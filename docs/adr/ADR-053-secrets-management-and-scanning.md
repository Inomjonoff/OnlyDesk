# ADR-053: Secrets Management & Scanning

## Status
Accepted

## Context
Accidental exposure of JWT signing keys, database passwords, or cloud AI credentials represents a critical vulnerability.

## Decision
We implement a zero-trust secret handling policy:
1. Environment schemas in `@nexusdesk/config` fail fast on boot in `NODE_ENV === "production"` if default dev secrets are detected.
2. An automated secret scanner script (`scripts/scan-secrets.ts`) runs as a mandatory gate in the CI/CD and release pipeline.
3. No secret keys or credentials are baked into client-side bundles or repository commits.

## Consequences
- Prevents production deployments from accidentally running with vulnerable default passwords.
- Enforces strict compliance before release artifacts are generated.
