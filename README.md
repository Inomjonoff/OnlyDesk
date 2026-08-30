# NexusDesk AI

### Production-Grade Remote Desktop & AI Support Platform

NexusDesk AI is a next-generation remote desktop and autonomous diagnostics platform combining ultra low-latency WebRTC screen streaming, native OS input capture/injection, zero-trust cryptographic device authentication (Ed25519), and real-time AI-assisted diagnostic evaluation.

---

## 🏗️ Monorepo Architecture

```text
/
├── apps/
│   ├── web/        # Next.js 15 Web Client & Remote Viewer
│   ├── desktop/    # Tauri 2 / Rust Native Client & Tray
│   └── admin/      # Vite + React Admin Control Center
│
├── services/
│   ├── api/        # Fastify REST Gateway + Prisma (PostgreSQL)
│   ├── signaling/  # Fastify WebSocket + Redis PubSub Signaling
│   ├── ai/         # AI Diagnostic Evaluation & Secret Redaction
│   └── worker/     # BullMQ / Redis Background Task Worker
│
├── packages/
│   ├── types/      # Shared Domain Types & Enums
│   ├── protocol/   # Versioned Protocol Codec & Channels
│   ├── crypto/     # Ed25519 Keys, Fingerprints, Tokens
│   ├── validation/ # Zod Request & Message Schemas
│   ├── config/     # Environment Configuration & Constants
│   └── ui/         # Design System Primitives & Tokens
│
├── native/
│   ├── windows/    # Windows Desktop Duplication & SendInput Layer
│   ├── macos/      # macOS ScreenCaptureKit & CGEvent Layer
│   └── linux/      # Linux PipeWire & uinput Layer
│
└── infra/
    ├── docker/     # Dockerfiles for Services
    ├── coturn/     # STUN/TURN Server Configuration
    ├── postgres/   # Database Initialization Scripts
    └── monitoring/ # Prometheus & Grafana Observability
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js `20+` or `22+` (Installed: `v24.14.0`)
- `pnpm` `9+` (Installed: `10.30.2`)
- `Docker Desktop` (for local PostgreSQL, Redis, Coturn, and MinIO)

### Installation

```bash
# Install all workspace dependencies
pnpm install

# Copy environment variables
cp .env.example .env.development

# Run typechecks across all packages and services
pnpm typecheck

# Run unit and integration tests
pnpm test

# Build all packages and applications
pnpm build

# Start dev servers in parallel
pnpm dev
```

### Docker Infrastructure

```bash
# Start PostgreSQL 16, Redis 7, Coturn STUN/TURN, MinIO, Prometheus, and Grafana
docker compose up -d
```

---

## 🛡️ Security Architecture

1. **Cryptographic Identity**: Every desktop installation derives an Ed25519 keypair and public-key SHA-256 fingerprint (`NXD-XXXX-XXXX` display format).
2. **Granular Capabilities**: Remote sessions start strictly in `SCREEN_VIEW` mode by default. Mouse, keyboard, clipboard, and file transfer require explicit, timed user approval.
3. **AI Secret Redaction**: All telemetry passes through local redaction filters before diagnostic evaluation by LLMs.
4. **Replay Protection**: Versioned protocol messages (`v1`) enforce monotonic sequence numbers and session-bound validation.

---

## 📋 Verification Status

- **Phase 0 (Architectural Foundation)**: Completed and Verified.
- **Next Phase**: Phase 1 — Authentication & Device Registration.
