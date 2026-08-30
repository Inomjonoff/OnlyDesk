# ADR-046: AI Action Policy Engine and Authorization Matrix

## Status

Accepted

## Context

Different environments require different degrees of AI autonomy, from pure observation to semi-automated triage.

## Decision

We implemented `ActionPolicyEngine` supporting four standard automation modes:

1. `OBSERVE_ONLY`: Only `READ_ONLY` diagnostics allowed; any modifying action is unconditionally denied.
2. `RECOMMEND`: `READ_ONLY` diagnostics allowed; modifying actions require explicit human approval.
3. `ASK_BEFORE_ACTION` (Default): All modifying actions require explicit human approval; critical actions are denied.
4. `LIMITED_AUTO`: `LOW` risk actions execute automatically; `MEDIUM`/`HIGH` risk actions require explicit human approval.

Decisions follow the principle of least privilege: the most restrictive policy across Organization, Device, Session, and Mode always wins.

## Consequences

Fine-grained enterprise and per-session control over AI autonomy.
