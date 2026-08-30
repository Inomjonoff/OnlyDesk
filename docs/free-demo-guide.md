# Free Demo Deployment Guide — NexusDesk AI

This guide walks through deploying the zero-cost free demo environment supporting up to 100 registered accounts and 5–10 concurrent WebRTC remote sessions.

---

## 1. Prerequisites

- 1x Free Tier or Low-Cost Linux VM (e.g. Oracle Cloud Free Tier, Hetzner, or AWS t4g.small with 2 vCPUs, 4GB RAM)
- Domain names configured: `app.nexusdesk.uz`, `api.nexusdesk.uz`, `signal.nexusdesk.uz`, `turn.nexusdesk.uz`
- Docker and Docker Compose v2 installed on the server

---

## 2. Fast Launch Instructions

```bash
# 1. Clone repository
git clone https://github.com/your-org/nexusdesk.git
cd nexusdesk

# 2. Copy demo environment configuration
cp .env.example .env

# 3. Start demo infrastructure
docker compose -f docker-compose.demo.yml up -d

# 4. Run database migrations
pnpm turbo run prisma:migrate

# 5. Provision 100 demo accounts and devices
pnpm tsx scripts/seed-demo.ts

# 6. Start application services
pnpm turbo run start
```

---

## 3. Quota Limits in Free Demo Mode

| Feature | Free Demo Quota |
| :--- | :--- |
| **Registered User Accounts** | 100 accounts max |
| **Simultaneous Remote Sessions** | 10 concurrent sessions max |
| **Max Session Duration** | 30 minutes (automatic graceful termination) |
| **File Transfer Size Limit** | 100 MB per transfer |
| **Screen Recording Limit** | 15 minutes per recording |
| **AI Copilot Queries** | 50 requests per user / day |
| **WebRTC Bandwidth Cap** | 2.5 Mbps per stream |
