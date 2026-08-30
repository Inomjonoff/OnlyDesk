# ADR-051: Production Deployment Architecture

## Status
Accepted

## Context
NexusDesk AI requires a production-grade yet cost-effective deployment topology capable of serving demo users and scaling up smoothly to enterprise environments.

## Decision
We adopt a hybrid multi-service architecture:
1. **Frontend / Web Dashboard**: Deployed on Vercel for instant edge delivery and global low-latency HTTPS.
2. **API & Signaling Control Plane**: Containerized on Linux VMs behind secure reverse proxy, leveraging Fastify and Redis PubSub.
3. **STUN/TURN WebRTC Relays**: Dedicated Coturn instance with ephemeral HMAC tokens to guarantee NAT traversal while capping bandwidth abuse.
4. **Authoritative Persistence**: PostgreSQL 16 for all user, device, permission, and audit state.

## Consequences
- Clean separation between control-plane metadata and P2P data-plane media streams.
- Zero data-plane load on the API server.
- Reproducible multi-container orchestration via `docker-compose.prod.yml`.
