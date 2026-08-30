# ADR-070: Public Beta Definition of Done & Quality Gate

## Status
Accepted

## Context
A project is not complete merely because code compiles or unit tests pass. A public beta is only complete when a non-technical end user can successfully download the installer, pair devices, and conduct a secure remote support session end-to-end.

## Decision
We define the strict criteria for Public Beta release:
1. **Full Lifecycle Verified**: Visitor → Landing → Register → Download Installer → Install Desktop → Pair Device → Request Remote Session → Approve Permissions → Stream Screen → Inject Input → Transfer File → Clipboard Sync → Chat → Consent Recording → AI Diagnostics → End Session → AI Session Summary Report.
2. **Zero Unresolved Critical Security Issues**: No unauthenticated bypasses, no IDOR vulnerabilities, no prompt injection vectors, no plaintext secret leaks.
3. **100% Typecheck, Format, and Automated Test Compliance** across all monorepo packages.

## Consequences
- The NexusDesk AI Public Beta is reliable, observable, secure, and ready for real-world user adoption.
