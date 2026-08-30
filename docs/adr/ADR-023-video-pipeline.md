# ADR-023: Zero-Copy Video Pipeline & Bounded Frame Queue

## Status

Accepted

## Context

High-resolution desktop video streaming (1080p/4K @ 30-60 FPS) generates substantial memory throughput. Unbounded queueing during network backpressure leads to memory exhaustion and high latency.

## Decision

1. **Bounded Frame Queue**: Limit frame buffers to a capacity of 2-4 frames.
2. **Latest-Frame Pacing**: Under encoder or network backpressure, stale intermediate frames are dropped immediately in favor of the freshest captured frame.
3. **Monotonic Timing**: Every frame is stamped with monotonic timestamps for accurate jitter buffer pacing and RTT calculation.
