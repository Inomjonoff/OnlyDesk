# Database Backup & Disaster Recovery Guide — NexusDesk AI

## 1. Automated PostgreSQL Backups

Backups are executed daily via automated cron using `scripts/backup-db.ts`.

### Manual Backup Command
```bash
pnpm tsx scripts/backup-db.ts
```
Creates a compressed, timestamped dump in `backups/backup_nexusdesk_YYYY-MM-DD_HH-mm-ss.sql`.

---

## 2. Disaster Recovery & Restoration Procedure

To restore the database from a backup dump:

```bash
# 1. Stop active API and worker services to prevent writes
docker compose stop api worker

# 2. Run restore script pointing to backup file
pnpm tsx scripts/restore-db.ts backups/backup_nexusdesk_2026-08-30_20-00-00.sql

# 3. Restart services
docker compose start api worker

# 4. Verify system health
curl https://api.nexusdesk.uz/health
```

---

## 3. Ephemeral State Verification (Redis)
Redis is ephemeral. In the event of a Redis crash:
1. Active WebSocket connections will reconnect and re-authenticate within 5 seconds.
2. PostgreSQL remains the authoritative source of truth for session permissions and device tokens.
