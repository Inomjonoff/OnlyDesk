# ADR-025: Adaptive Bitrate Controller with Anti-Oscillation Hysteresis

## Status

Accepted

## Context

Transient network congestion and packet loss can degrade real-time video delivery. Blindly adjusting bitrate on every packet sample causes rapid visual oscillation and encoder stutter.

## Decision

1. **Adaptive Feedback Loop**: The `StreamingController` continuously evaluates RTT, jitter, and packet loss from WebRTC receiver statistics.
2. **Smoothing & Hysteresis**: Bitrate and FPS adjustments are bounded by a minimum cooldown interval (3,000 ms) and tiered thresholds (Stable, Degraded, Severely Degraded, Recovering).
3. **On-Demand Keyframe Requests**: Keyframe regeneration is triggered explicitly upon late join or packet loss burst recovery via `control.keyframe_request`.
