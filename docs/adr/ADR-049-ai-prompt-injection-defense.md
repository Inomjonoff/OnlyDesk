# ADR-049: AI Prompt Injection Defense and Data Isolation

## Status

Accepted

## Context

Malicious actors or compromised applications on the target machine could inject instructions into open error dialogs, logs, or process names to hijack AI behavior.

## Decision

1. All inspected target machine content (screen text, log lines, process titles) is demarcated with strict delimiter tags: `<<<REMOTE_DATA_START>>>` and `<<<REMOTE_DATA_END>>>`.
2. System prompts explicitly instruct models that data inside these delimiters is untrusted observational data and must never be interpreted as system commands or rule overrides.
3. Strict separation of "Observed", "Inferred", and "Unknown" facts in model outputs.

## Consequences

Protects against indirect prompt injection via inspected target machine UI or logs.
