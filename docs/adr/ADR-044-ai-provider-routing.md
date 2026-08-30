# ADR-044: AI Provider Routing and Fallback Strategy

## Status

Accepted

## Context

NexusDesk must function reliably across varying cloud model availability, latency requirements, and air-gapped or privacy-conscious enterprise deployments.

## Decision

We implemented `AIProviderRouter` with:

1. Dynamic capability matching (e.g. vision requirement routes only to vision-capable models).
2. Fallback chains: if primary provider encounters transient outages or rate limits (429/503), it falls back seamlessly to secondary registered providers.
3. Air-gapped / Local model support via `OllamaProvider`.
4. Usage and cost telemetry tracking per session and organization.

## Consequences

High resilience to upstream LLM outages with automated failover and zero user disruption.
