# ADR-036: DataChannel Flow Control, Backpressure & Fairness Management

## Status

Accepted

## Context

Streaming large files over WebRTC DataChannels at maximum network speeds can overwhelm SCTP send buffers (`bufferedAmount`), leading to memory bloat, latency spikes, and packet starvation on interactive video and input channels.

## Decision

1. **High/Low Water Mark Flow Control**: The file producer pauses streaming when `fileChannel.bufferedAmount` exceeds the high water mark (4 MiB) and resumes once it drains below the low water mark (1 MiB).
2. **Channel Separation & Fairness**: Critical control packets (`controlChannel`), mouse/keyboard events, and lightweight clipboard updates are routed over independent DataChannels, preventing head-of-line blocking by bulk file transfers.
