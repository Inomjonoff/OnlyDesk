# ADR-021: WebRTC Fault Recovery & ICE Restart Loop Protection

## Status

Accepted

## Context

Network changes (Wi-Fi to Ethernet, VPN activation, transient packet drop) can disrupt active WebRTC connections. The system must recover gracefully without forcing the user to create a new session from scratch.

## Decision

1. **Candidate Buffering**: ICE candidates arriving before `setRemoteDescription` are queued in `pendingIceCandidates` and flushed immediately once the remote SDP is applied.
2. **Controlled ICE Restart**: On connection failure or interface change, the initiator triggers `restartIce()`, producing an updated SDP offer with `iceRestart: true`.
3. **Loop Protection**: ICE restarts are bounded to a maximum of 3 attempts. If connectivity cannot be restored after 3 retries, the session transitions cleanly to `FAILED` / `ENDED` with structured reason `RTC_CONNECTION_FAILED`.
