# Incident Response Runbook — NexusDesk AI

## Severity Levels

- **SEV-1 (Critical)**: Total system outage; signaling or WebRTC transport completely down for all users.
- **SEV-2 (High)**: Major feature degradation (e.g. file transfers failing or AI provider timing out).
- **SEV-3 (Medium)**: Intermittent errors, localized relay latency spikes, or single-user issues.

---

## 1. WebRTC Relay Latency or Disconnect Spikes
1. Check Coturn container status: `docker logs nexusdesk-prod-coturn --tail 100`
2. Verify bandwidth consumption: `curl http://api:4000/metrics | grep nexusdesk_signaling`
3. If Coturn is starved for UDP ports, restart Coturn: `docker compose restart coturn`

---

## 2. API High Error Rate Alert (>5%)
1. Check API logs with structured Pino filter: `docker logs nexusdesk-prod-api --tail 200`
2. Verify PostgreSQL connection pool: `pg_isready -h localhost -p 5432`
3. Inspect slow queries in PostgreSQL logs.

---

## 3. Suspected Security Compromise or Token Leak
1. Invalidate all active user JWT tokens by rotating `JWT_SECRET` in `.env.production`.
2. Terminate all active sessions: `POST /api/v1/admin/sessions/emergency-terminate-all`
3. Run secret scanner: `pnpm tsx scripts/scan-secrets.ts`
