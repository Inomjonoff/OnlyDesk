# ADR-024: Video Codec Negotiation & Hardware Acceleration

## Status

Accepted

## Context

Different remote endpoints support different hardware decoding capabilities. Encoding desktop screen streams requires balancing compression efficiency with encoding latency.

## Decision

1. **Codec Priority**: Prefer **H.264** with hardware acceleration (NVENC, Intel Quick Sync, AMD AMF, Media Foundation) for lowest CPU overhead.
2. **Software Fallback**: Fall back to **VP8** / **VP9** if hardware H.264 is unavailable on the client.
3. **Dynamic Capability Negotiation**: WebRTC SDP renegotiation dynamically agrees on the optimal supported codec and profile level between host and viewer.
