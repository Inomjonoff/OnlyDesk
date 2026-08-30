# ADR-057: Desktop Client Device Key Protection & DPAPI

## Status
Accepted

## Context
Device private keys (Ed25519) stored on the host machine must not reside as plaintext files on disk where other unprivileged processes might exfiltrate them.

## Decision
1. Implement `SecureKeyStorage` in `@nexusdesk/crypto` providing an OS-level secure storage abstraction.
2. In native Windows desktop environments, delegate to Windows Data Protection API (DPAPI) and Windows Credential Manager.
3. In container/test environments, protect stored secrets with AES-256-GCM and machine-derived entropy salt.

## Consequences
- Device private keys are encrypted at rest with hardware/user-session bound keys.
- Clean separation of native key protection from core cryptographic signing APIs.
