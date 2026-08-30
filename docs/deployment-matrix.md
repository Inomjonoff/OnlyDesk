# Production Application Deployment Matrix — NexusDesk AI

| Component | Hosting Provider | Public URL / Endpoint | State Model | Criticality | Health Endpoint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Web Dashboard** | Vercel | `https://app.nexusdesk.uz` | Stateless | High | `https://app.nexusdesk.uz/api/health` |
| **API Gateway** | Cloud VM / Docker | `https://api.nexusdesk.uz` | Stateless | Critical | `https://api.nexusdesk.uz/health` |
| **Signaling Server** | Cloud VM / Docker | `wss://signal.nexusdesk.uz` | Stateless + Redis PubSub | Critical | `https://signal.nexusdesk.uz/health` |
| **AI Intelligence** | Internal Container | `http://ai:4002` | Stateless | High | `http://ai:4002/health` |
| **Worker Service** | Internal Container | `http://worker:4003` | BullMQ Consumer | High | `http://worker:4003/health` |
| **PostgreSQL 16** | Managed / Local Docker | Private Network: 5432 | Stateful | Critical | `pg_isready` |
| **Redis 7** | Managed / Local Docker | Private Network: 6379 | Ephemeral Cache & PubSub | Critical | `redis-cli ping` |
| **STUN/TURN Relay** | Public VM (Coturn) | `turn.nexusdesk.uz:3478` | Stateless UDP/TCP Relay | Critical | Port probe |
| **Object Storage** | MinIO / S3 | `https://storage.nexusdesk.uz` | Stateful Recordings | High | S3 API probe |
| **Prometheus** | Monitoring VM | `https://status.nexusdesk.uz:9090` | Time Series TSDB | Medium | `/metrics` |
