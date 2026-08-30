# ADR-065: Privacy Center & AI Disclosures

## Status
Accepted

## Context
Remote desktop and AI assistance technologies handle sensitive user screen content and system data. Full transparency and customizable privacy defaults are non-negotiable.

## Decision
1. Implement a dedicated Privacy Center in Settings allowing users to configure recording consent, clipboard synchronization, and AI context ingestion.
2. Disclose external cloud AI model usage clearly (e.g. "Sent to Google Gemini / OpenAI / Anthropic") vs 100% offline local processing (Ollama).
3. Redact secret tokens, private keys, database passwords, and environment credentials before any diagnostic telemetry leaves the client machine.

## Consequences
- Total user control over sensitive data flows.
- Adherence to zero-trust privacy and GDPR/SOC-2 alignment.
