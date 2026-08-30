# ADR-041: Mandatory Host Recording Consent & Persistent Visual Indicators

## Status

Accepted

## Context

Capturing a user's desktop without their explicit knowledge or agreement is a critical security and privacy violation.

## Decision

1. **Two-Factor Authorization**: Starting a recording requires both the `RECORDING` permission and real-time explicit consent from the host machine via a modal prompt.
2. **Persistent Visual Indicator**: While recording is active, a prominent `● RECORDING` badge is permanently rendered on both host and viewer interfaces with an immediate stop control.
3. **Audit Logging**: Every recording request, approval, rejection, start, stop, and access event is logged in the compliance audit trail.
