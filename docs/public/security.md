# Security & Zero-Trust Architecture

NexusDesk AI is engineered around the principle of zero implicit trust.

## Core Protections
1. **End-to-End Encryption**: All WebRTC video tracks and data channels are protected with DTLS-SRTP and DTLS-SCTP.
2. **Device Identity**: Every client is cryptographically identified by its Ed25519 public key SHA-256 fingerprint.
3. **Double Policy Verification**: Actions and permissions are validated both by the cloud control plane and verified a second time on the local host machine.
4. **No Open Relays**: TURN servers strictly filter private internal IP networks (RFC 1918) and enforce time-bound HMAC tokens.
