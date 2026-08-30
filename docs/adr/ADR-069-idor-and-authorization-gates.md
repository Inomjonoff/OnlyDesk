# ADR-069: IDOR & Authorization Gates

## Status
Accepted

## Context
Insecure Direct Object Reference (IDOR) vulnerabilities could allow malicious actors to approve remote sessions on behalf of other users or access private session recordings.

## Decision
1. Implement strict cryptographic and user-session ownership verification across all session lifecycle endpoints (`/approve`, `/ready`, `/end`, `/recordings`).
2. Enforce that only the authentic owner of the target device (`session.targetUserId === req.user.sub`) can approve or elevate remote control permissions.
3. Validate session authorization gates using automated IDOR penetration test suites (`services/api/src/__tests__/idor-security.test.ts`).

## Consequences
- Guaranteed cryptographic isolation between distinct user accounts and organizations.
- Total mitigation of session hijack and unauthorized permission elevation vectors.
