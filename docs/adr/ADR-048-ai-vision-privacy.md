# ADR-048: AI Vision Privacy and On-Demand Capture

## Status

Accepted

## Context

Sending continuous video feeds to external multimodal models would violate session privacy and consume excessive bandwidth and compute.

## Decision

1. Vision analysis is strictly **on-demand** upon explicit user request (e.g. "Analyze Screen"). Continuous streaming to AI is prohibited.
2. Requires explicit `AI_SCREEN_ANALYSIS` session permission.
3. Screenshots older than 5,000ms are treated as stale and rejected.
4. Ephemeral storage with a 7-day retention limit for vision artifacts.

## Consequences

Preserves user privacy, minimizes data leakage risk, and avoids unnecessary LLM vision costs.
