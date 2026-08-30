# ADR-045: AI Tool Registry and Execution Model

## Status

Accepted

## Context

Allowing models to invoke arbitrary host capabilities creates critical security vulnerabilities.

## Decision

We implemented a strict `ToolRegistry`:

1. Only statically registered tools can be invoked; all unknown tools return `DENY`.
2. Each tool has an explicit static `AiRiskLevel` and required session permission.
3. Every tool invocation has strict timeouts (5-15s).
4. Tool loop detection automatically blocks repeated identical calls within 3 seconds.
5. Verifiers run post-execution to confirm that host state actually changed as expected.

## Consequences

Guarantees deterministic bounds on what actions an AI model can propose or execute.
