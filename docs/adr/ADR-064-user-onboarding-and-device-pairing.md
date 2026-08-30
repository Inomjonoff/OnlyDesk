# ADR-064: User Onboarding & Device Pairing

## Status
Accepted

## Context
Non-developer users require a guided, visual onboarding path from account creation to first active screen streaming.

## Decision
1. Provide an interactive 3-step Onboarding Checklist (`/onboarding`): Account Creation → Desktop Agent Pairing → Test Remote Session.
2. Device Pairing pairs an Ed25519 cryptographic keypair generated on the client machine with the user's account, displaying a sanitized device name and human-readable Device ID (`NXD-XXXX-YYYY`).
3. Allow one-click device revocation from the web dashboard that immediately cascades to invalidate active session tokens.

## Consequences
- High onboarding completion rates with minimal support overhead.
- Instant device decommissioning upon lost or replaced laptops.
