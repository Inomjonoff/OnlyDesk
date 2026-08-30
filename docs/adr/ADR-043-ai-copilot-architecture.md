# ADR-043: AI Copilot System Architecture

## Status

Accepted

## Context

NexusDesk requires an AI assistant layer to assist human operators in diagnosing and resolving technical support issues during active remote desktop sessions. The AI must never have unrestricted access or the ability to execute arbitrary commands on the target operating system.

## Decision

We adopted a multi-tier AI copilot architecture:

1. **Provider Layer**: Provider-agnostic abstraction (`AIProvider` & `AIProviderRouter`) supporting Google Gemini, OpenAI, Anthropic, OpenRouter, and Ollama.
2. **Context Layer**: Minimal context assembly with strict secret redaction and prompt injection delimiters.
3. **Tool Registry**: Allowlist-only tool registry (`ToolRegistry`) with strict risk levels (`READ_ONLY`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
4. **Policy Engine**: Hierarchical evaluation (`ActionPolicyEngine`) enforcing Organization > Device > Session > Automation Mode > Tool Risk.
5. **Action Lifecycle**: Formal state machine (`ActionLifecycleManager`) with short-lived (60s), single-use approval tokens bound by argument hashes and nonces.

## Consequences

- **Positive**: Zero arbitrary code execution risk, complete human-in-the-loop auditability, flexible model selection.
- **Negative**: Adds a fast approval roundtrip before executing non-read-only optimizations.
