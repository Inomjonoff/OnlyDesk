# Security Policy & Architecture — NexusDesk AI

## 1. Zero-Trust Control Plane

- **No Implicit Trust**: Remote desktop access is never granted implicitly or silently.
- **Default Read-Only**: New sessions begin exclusively in `SCREEN_VIEW` mode.
- **Explicit Elevation**: Mouse, keyboard, clipboard, file transfer, and AI actions require real-time interactive user approval with expiring timers.
- **Public Key Cryptography**: Devices are cryptographically identified by their Ed25519 public key SHA-256 fingerprint.

## 2. AI Safety, Tool Policy & Privacy Boundaries (Phase 8)

- **Strict Tool Allowlist**: The AI cannot invoke shell commands (no CMD, PowerShell, Bash). Only statically registered tools in `ToolRegistry` are accessible.
- **Secret Redaction Pipeline**: Telemetry, logs, and process parameters are filtered to redact JWTs, SSH private keys, AWS access keys, API keys, database connection strings, and passwords prior to model invocation.
- **Prompt Injection Defense**: All target machine data is enclosed in `<<<REMOTE_DATA_START>>>` fences and explicitly treated as untrusted data, preventing indirect instruction injection.
- **Human-in-the-Loop Approval Model**: Every non-read-only action requires explicit human approval with single-use, 60-second approval tokens bound to action parameter hashes and nonces.
- **Computer-Use Safety**: AI GUI interaction requires dedicated `AI_COMPUTER_USE` permission, bounded within short-lived `AiControlLease` scopes (max 5 steps per approval, 30s expiry), normalized coordinate verification `[0.0, 1.0]`, sensitive UI protection, and immediate Emergency Stop ("STOP AI").
- **Double Policy Check**: Actions are validated twice: once by the AI Service and once by the host desktop executor before execution.
- **On-Demand Vision**: Screen vision analysis requires explicit `AI_SCREEN_ANALYSIS` permission and only captures single on-demand frames upon direct user command. Continuous streaming to AI is prohibited.

## 3. WebRTC & Media Security

- All peer-to-peer streams and data channels are encrypted end-to-end via DTLS-SRTP and DTLS-SCTP.
- TURN relay credentials are ephemeral and time-bound.
- RFC 1918 private IP subnets and loopback addresses are blocked on TURN relays (`denied-peer-ip`).

## 4. Production Hardening & Secrets Management (Phase 9)

- **Automated Secret Scanning**: Pre-flight gates in CI (`scripts/scan-secrets.ts`) scan all commits for exposed RSA/EC keys, AWS credentials, JWT secrets, and DB URLs.
- **Fail-Fast Environment Validation**: Production boot fails immediately if default development secrets are detected.
- **OS Secure Key Storage**: Host Ed25519 private keys are encrypted via Windows DPAPI and Credential Manager abstractions (`SecureKeyStorage`).
- **Demo Quotas & Rate Limits**: Multi-tiered rate limiting (100 req/min API, 10 sessions/min, 2.5 Mbps TURN relay caps) strictly protects free-tier infrastructure.
- **Automated Disaster Recovery**: Daily automated database snapshots (`scripts/backup-db.ts`) with tested restore validation (`scripts/restore-db.ts`).
