# System Architecture — NexusDesk AI

```mermaid
graph TD
    subgraph Clients
        WebClient["Web Client (Next.js 15)"]
        DesktopA["Desktop Host A (Tauri / Rust)"]
        DesktopB["Desktop Viewer B (Tauri / Rust)"]
        AdminDashboard["Admin Dashboard (Vite / React)"]
    end

    subgraph Edge & API Layer
        ApiGateway["API Gateway (Fastify / TypeScript)"]
        Signaling["Signaling Server (WebSocket)"]
    end

    subgraph Data & State
        PostgreSQL[("PostgreSQL 16")]
        Redis[("Redis 7 (PubSub & Cache)")]
        MinIO[("MinIO Object Storage")]
    end

    subgraph AI & Background
        AIService["AI Intelligence Service (Fastify / Multi-Provider)"]
        Worker["BullMQ Worker (Transcode / Cleanup / Reports)"]
    end

    subgraph Media Transport
        STUN_TURN["Coturn (STUN / TURN Server)"]
    end

    WebClient -->|HTTPS / REST| ApiGateway
    AdminDashboard -->|HTTPS / REST| ApiGateway
    DesktopA -->|HTTPS / REST| ApiGateway
    DesktopB -->|HTTPS / REST| ApiGateway

    DesktopA <-->|WebSocket| Signaling
    DesktopB <-->|WebSocket| Signaling

    Signaling <-->|Pub/Sub| Redis
    ApiGateway <--> PostgreSQL
    ApiGateway <--> Redis

    DesktopA <-.->|WebRTC Direct P2P / DTLS-SRTP| DesktopB
    DesktopA -.->|Fallback TURN Relay| STUN_TURN
    DesktopB -.->|Fallback TURN Relay| STUN_TURN

    ApiGateway --> AIService
    Worker <--> Redis
    Worker --> MinIO
```

## Layer Specifications

1. **Native Client Layer**:
   - Built on Tauri 2 with native OS screen capture (DXGI Desktop Duplication on Windows, ScreenCaptureKit on macOS, PipeWire on Linux).
   - Direct hardware-accelerated video encoding, isolated WebRTC data channels, and host-side double policy execution checking.

2. **Signaling & State Plane**:
   - Stateless WebSocket connections backed by Redis PubSub allowing seamless horizontal clustering across multiple instances.

3. **AI Intelligence Engine (Phase 8)**:
   - Decoupled microservice supporting multi-provider fallback (Google Gemini, OpenAI, Anthropic, OpenRouter, and local Ollama).
   - Strict secret scrubbers ensure zero credential leakage.
   - Formal Tool Registry with static risk classifications, execution timeouts, and loop detection.
   - Policy Engine enforcing automation modes (`OBSERVE_ONLY`, `RECOMMEND`, `ASK_BEFORE_ACTION`, `LIMITED_AUTO`).
   - Computer-use safety engine with short-lived control leases, coordinate normalization, and emergency stop.
   - Post-session intelligence report generator grounded in verified telemetry facts.

4. **Observability, Resilience & Deployment Layer (Phase 9)**:
   - Unified `/health`, `/ready`, `/live`, and Prometheus `/metrics` endpoints across all backend services.
   - AlertManager routing critical threshold alerts (>5% error rate, relay latency spikes, connection capacity).
   - Rate limiting and free-demo quota governance (`DEMO_QUOTAS`) protecting public demo instances.
   - Verified automated database backup (`scripts/backup-db.ts`) and recovery (`scripts/restore-db.ts`) runbooks.
   - Release management pipeline (`scripts/release.ts`) and fast rollback automation (`scripts/rollback.ts`).

