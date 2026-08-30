# ADR-066: Support Diagnostics & Safe Support Bundles

## Status
Accepted

## Context
When troubleshooting connection problems or ICE candidate failures, users must be able to export diagnostic logs without accidentally leaking private tokens, keys, or passwords.

## Decision
1. Implement `DesktopDiagnosticBundleGenerator` to assemble a strictly sanitized JSON bundle: client version, platform, WebRTC ICE state, RTT, and error codes.
2. Filter out email addresses, private keys, device secrets, and screen contents from all exported logs.
3. Provide an interactive Troubleshooting Wizard in `/help` assisting users with firewall and UDP port settings.

## Consequences
- Fast resolution of technical support tickets.
- Zero risk of sensitive credential exposure during customer support triage.
