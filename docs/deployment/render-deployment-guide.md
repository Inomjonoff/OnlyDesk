# Render.com Deployment Guide — NexusDesk AI Backend

This guide outlines how to deploy the **NexusDesk AI Control Plane (API)**, **Signaling Server (WebSocket)**, and **PostgreSQL Database** on Render.com.

---

## Architecture on Render

```text
┌────────────────────────────────────────────────────────┐
│                      Vercel.app                        │
│            (https://nexusdesk-web.vercel.app)          │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
         REST HTTPS Requests       WSS WebSockets
                │                        │
                ▼                        ▼
     ┌─────────────────────┐  ┌─────────────────────┐
     │   nexusdesk-api     │  │ nexusdesk-signaling │
     │  (Render Web Service│  │ (Render Web Service │
     │   Node.js/Fastify)  │  │   WebSocket Gateway)│
     └──────────┬──────────┘  └──────────┬──────────┘
                │                        │
                ▼                        ▼
     ┌─────────────────────┐  ┌─────────────────────┐
     │    nexusdesk-db     │  │   nexusdesk-redis   │
     │ (Render PostgreSQL) │  │   (Render Key-Value)│
     └─────────────────────┘  └─────────────────────┘
```

---

## 1-Click Deployment via Render Blueprint

1. Go to [https://dashboard.render.com/blueprints](https://dashboard.render.com/blueprints).
2. Click **"New Blueprint Instance"**.
3. Connect your GitHub repository: `Inomjonoff/OnlyDesk`.
4. Render will automatically detect the `render.yaml` file and create:
   - **PostgreSQL Database**: `nexusdesk-db`
   - **API Service**: `nexusdesk-api` (e.g. `https://nexusdesk-api.onrender.com`)
   - **Signaling Service**: `nexusdesk-signaling` (e.g. `https://nexusdesk-signaling.onrender.com`)
5. Click **"Apply"** and wait ~2-3 minutes for the build to finish.

---

## Connecting Render Backend to Vercel Frontend

Once Render gives you your live service URLs (e.g. `https://nexusdesk-api.onrender.com` and `wss://nexusdesk-signaling.onrender.com`):

1. Go to your **Vercel Project Dashboard** -> **Settings** -> **Environment Variables**.
2. Add the following variables:
   - `NEXT_PUBLIC_API_URL` = `https://nexusdesk-api.onrender.com`
   - `NEXT_PUBLIC_SIGNAL_URL` = `wss://nexusdesk-signaling.onrender.com/ws`
3. Click **"Redeploy"** on Vercel.

---

## Verification Checklist

- [ ] Check API Health: `curl https://nexusdesk-api.onrender.com/health` -> `{"status":"ok"}`
- [ ] Check Signaling Health: `curl https://nexusdesk-signaling.onrender.com/health` -> `{"status":"ok"}`
- [ ] Open Vercel Web App: Register a new real account and log in.
