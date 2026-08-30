# NEXUSDESK AI

## Production-Grade Remote Desktop & AI Support Platform

### Master Engineering Specification for an Autonomous Coding Agent

---

# 0. ROLE

You are not a UI generator.

You are acting simultaneously as:

- Principal Software Architect
- Distributed Systems Engineer
- Network Engineer
- Rust Engineer
- TypeScript Engineer
- Security Engineer
- DevOps Engineer
- QA Engineer
- AI Systems Engineer

Your responsibility is to DESIGN, IMPLEMENT, TEST, DEBUG, DOCUMENT, and VERIFY a real remote desktop platform.

The target product is an original remote support platform inspired by the functionality of AnyDesk, TeamViewer, RustDesk, Chrome Remote Desktop, and similar products.

Do NOT copy:

- proprietary source code
- proprietary protocols
- branding
- UI assets
- logos
- trademarks
- undocumented reverse-engineered implementations

Build an original architecture.

The final system must contain real working components.

Do not create fake buttons.

Do not simulate remote desktop with placeholder videos.

Do not use mock APIs in production paths.

Do not mark incomplete functionality as completed.

---

# 1. PRIMARY PRODUCT

Product name:

NexusDesk AI

Product category:

Remote Desktop + Remote Support + AI Diagnostics Platform

Primary objectives:

1. Remote screen viewing
2. Remote mouse control
3. Remote keyboard control
4. File transfer
5. Clipboard synchronization
6. Session chat
7. Session recording
8. Device management
9. Secure authentication
10. AI-assisted diagnostics
11. AI-assisted troubleshooting
12. Session analytics
13. Audit logging

---

# 2. NON-NEGOTIABLE ENGINEERING PRINCIPLES

Follow these rules throughout the project.

## Rule 1 — Real implementation

A feature is complete only when:

- backend exists
- frontend exists where required
- native layer exists where required
- protocol exists
- persistence exists where required
- errors are handled
- tests exist
- feature is manually verifiable

---

## Rule 2 — No fake functionality

Forbidden:

```text
alert("Coming soon")
```

presented as a finished feature.

Forbidden:

```text
setTimeout(() => {
    connected = true
}, 1000)
```

to simulate networking.

Forbidden:

```text
fakeScreenStream()
```

in a production path.

Forbidden:

hardcoded device IDs.

Forbidden:

mock remote mouse events pretending to control a real computer.

---

# 3. SYSTEM ARCHITECTURE

Use a monorepo.

Preferred:

```text
pnpm
Turborepo
```

Architecture:

```text
                    ┌──────────────────────┐
                    │      Web Client      │
                    │ Next.js + React      │
                    └──────────┬───────────┘
                               │
                             HTTPS
                               │
                    ┌──────────▼───────────┐
                    │      API Gateway     │
                    │ Fastify / TypeScript │
                    └───────┬───────┬──────┘
                            │       │
                         Redis   PostgreSQL
                            │       │
                            └───┬───┘
                                │
                       ┌────────▼────────┐
                       │ Signaling Layer │
                       │ WebSocket       │
                       └────────┬────────┘
                                │
                 ┌──────────────┴───────────────┐
                 │                              │
          ┌──────▼──────┐                ┌──────▼──────┐
          │ Desktop A   │◄── WebRTC ────►│ Desktop B   │
          │ Tauri/Rust  │                │ Tauri/Rust  │
          └─────────────┘                └─────────────┘
                 │                              │
                 ├── screen capture             ├── screen capture
                 ├── input injection             ├── input injection
                 ├── clipboard                   ├── clipboard
                 ├── filesystem                  ├── filesystem
                 └── system diagnostics          └── system diagnostics
```

Additional infrastructure:

```text
TURN
Object Storage
AI Service
Monitoring
Logging
```

---

# 4. REPOSITORY

Create:

```text
/
├── apps/
│   ├── web/
│   ├── desktop/
│   └── admin/
│
├── services/
│   ├── api/
│   ├── signaling/
│   ├── ai/
│   └── worker/
│
├── packages/
│   ├── protocol/
│   ├── types/
│   ├── crypto/
│   ├── validation/
│   ├── config/
│   └── ui/
│
├── native/
│   ├── windows/
│   ├── macos/
│   └── linux/
│
├── infra/
│   ├── docker/
│   ├── coturn/
│   ├── postgres/
│   ├── redis/
│   └── monitoring/
│
├── docs/
│
├── tests/
│
├── scripts/
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

---

# 5. TECHNOLOGY STACK

## Desktop

Primary:

```text
Tauri 2
Rust
TypeScript
React
```

Use Rust for privileged/native functionality.

Use TypeScript/React for UI.

Never implement privileged operations only in the frontend.

---

## Web

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
Zustand
Zod
```

---

## API

```text
Node.js
TypeScript
Fastify
Zod
Prisma
PostgreSQL
Redis
WebSocket
```

---

## Signaling

Use:

```text
WebSocket
Redis Pub/Sub
```

The signaling service must be stateless at the application layer where possible.

---

## RTC

Use:

```text
WebRTC
STUN
TURN
ICE
DTLS-SRTP
```

Use WebRTC for:

- media transport
- low-latency data channels

Use DataChannels for appropriate control/data channels.

---

## Infrastructure

```text
Docker
Docker Compose
PostgreSQL
Redis
coturn
S3-compatible object storage
Prometheus
Grafana
Loki
```

---

# 6. PLATFORM SUPPORT

Primary target:

```text
Windows 10+
Windows 11
```

Architecture ready for:

```text
macOS
Linux
```

Do not pretend cross-platform support exists if native functionality has only been implemented for Windows.

Implement OS capabilities behind interfaces.

Example:

```rust
trait ScreenCapture {
    fn start_capture(&self) -> Result<ScreenStream>;
}

trait InputController {
    fn move_mouse(&self, x: i32, y: i32) -> Result<()>;
    fn mouse_button(&self, button: MouseButton, action: ButtonAction) -> Result<()>;
    fn keyboard_event(&self, event: KeyboardEvent) -> Result<()>;
}

trait ClipboardManager {
    fn read(&self) -> Result<ClipboardData>;
    fn write(&self, data: ClipboardData) -> Result<()>;
}
```

---

# 7. DEVICE IDENTITY

Every desktop installation generates a cryptographic identity.

At installation:

```text
device_id
device_private_key
device_public_key
```

Store private key in OS secure storage.

Never put private keys in:

```text
localStorage
IndexedDB
plaintext config files
database plaintext fields
```

Windows:

Use Windows credential/secure storage mechanisms where appropriate.

macOS:

Use Keychain.

Linux:

Use Secret Service / system credential storage where practical.

---

# 8. DEVICE ID FORMAT

Human-readable ID:

```text
NXD-AB12-CD34
```

But the real security identity is the public-key fingerprint.

Example:

```text
device_id:
NXD-AB12-CD34

fingerprint:
SHA256:xxxxxxxxxxxxxxxx
```

Never authenticate solely by device ID.

---

# 9. DATABASE

Use PostgreSQL.

Prisma schema must include at minimum:

```text
User
Organization
Membership
Device
DeviceKey
DeviceStatus
RemoteSession
SessionParticipant
SessionPermission
SessionEvent
FileTransfer
FileTransferChunk
ClipboardEvent
ChatMessage
Recording
AuditLog
AiConversation
AiMessage
AiInsight
DiagnosticSnapshot
CommandRequest
CommandExecution
ApiKey
RefreshToken
LoginSession
RateLimitRecord
```

---

# 10. DATABASE RELATIONSHIP MODEL

Core relationships:

```text
User
 ├── Devices
 ├── RemoteSessions
 ├── AuditLogs
 └── AiConversations

Organization
 ├── Members
 └── Devices

RemoteSession
 ├── Participants
 ├── Permissions
 ├── Events
 ├── Files
 ├── Messages
 ├── Recordings
 ├── Diagnostics
 └── AI Conversations
```

Use foreign keys.

Use indexes for:

```text
device.user_id
device.organization_id
session.created_at
session.status
audit_log.created_at
audit_log.user_id
```

Use soft deletion where appropriate.

---

# 11. AUTHENTICATION

Implement:

```text
email/password
Google OAuth
JWT access token
refresh token
2FA
session revocation
device login history
```

Password hashing:

```text
Argon2id
```

Access tokens:

short TTL.

Refresh tokens:

rotating.

Never store raw refresh tokens.

Store hashes.

---

# 12. AUTHORIZATION MODEL

Use RBAC + capability permissions.

Roles:

```text
USER
SUPPORT_AGENT
ADMIN
OWNER
```

Session permissions:

```text
SCREEN_VIEW
MOUSE_CONTROL
KEYBOARD_CONTROL
CLIPBOARD_READ
CLIPBOARD_WRITE
FILE_READ
FILE_WRITE
SYSTEM_INFO
PROCESS_LIST
LOG_READ
COMMAND_REQUEST
RECORDING
AI_ANALYSIS
```

Authorization must be checked:

1. frontend
2. backend
3. signaling layer
4. desktop agent

Never trust frontend permissions.

---

# 13. REMOTE SESSION STATE MACHINE

Implement explicit state machine.

```text
CREATED
↓
REQUESTED
↓
WAITING_FOR_APPROVAL
↓
APPROVED
↓
NEGOTIATING
↓
CONNECTING
↓
CONNECTED
↓
RECONNECTING
↓
CONNECTED
↓
ENDED
```

Failure states:

```text
REJECTED
TIMEOUT
FAILED
EXPIRED
CANCELLED
```

Use strongly typed enums.

Never use arbitrary strings throughout the application.

---

# 14. CONNECTION FLOW

Connection flow:

```text
Client A
   │
   │ HTTPS API
   ▼
Create Session
   │
   ▼
Signaling Server
   │
   │ WebSocket
   ▼
Client B
   │
   │ user approval
   ▼
Permission Grant
   │
   ▼
Offer / Answer
   │
   ▼
ICE Candidates
   │
   ▼
STUN
   │
   ├──── success ───► P2P
   │
   └──── failure ───► TURN
```

Implement timeouts.

Implement cleanup on failure.

---

# 15. WEBRTC CHANNELS

Use separate channels.

Example:

```text
control
input
clipboard
file
telemetry
chat
```

Each channel must have a defined message protocol.

Do not send arbitrary JSON everywhere.

Use versioned schemas.

Example:

```text
protocol_version: 1
message_type: mouse_move
sequence: 18442
timestamp: ...
payload: ...
```

Validate every incoming packet.

---

# 16. CONTROL PROTOCOL

Define strongly typed messages.

Example:

```typescript
type ControlMessage =
  | {
      type: "session.ready";
      sessionId: string;
    }
  | {
      type: "permission.changed";
      permission: Permission;
      granted: boolean;
    }
  | {
      type: "heartbeat";
      timestamp: number;
    };
```

---

# 17. INPUT PROTOCOL

Mouse:

```text
mouse.move
mouse.down
mouse.up
mouse.wheel
mouse.double_click
```

Keyboard:

```text
keyboard.down
keyboard.up
```

Every input event must include:

```text
sequence
timestamp
```

Prevent replay.

Reject invalid sequence jumps where appropriate.

---

# 18. SCREEN CAPTURE PIPELINE

Implement:

```text
Desktop Frame
↓
Capture
↓
Color Conversion
↓
Optional Region Detection
↓
Encode
↓
Transport
↓
Decode
↓
Render
```

Prefer efficient platform-native APIs.

On Windows use an appropriate native capture pipeline such as Desktop Duplication / Windows Graphics Capture where suitable.

Do not capture the screen by repeatedly taking ordinary screenshots with high CPU usage.

Target:

```text
30 FPS
```

with optional:

```text
60 FPS
```

---

# 19. ENCODING

Architecture must support:

```text
H.264
VP8
VP9
AV1
```

Use codecs supported by the runtime/platform.

Prioritize:

```text
low latency
hardware acceleration
adaptive bitrate
```

Do not assume AV1 is available on every client.

---

# 20. ADAPTIVE STREAMING

Collect:

```text
RTT
packet loss
jitter
bandwidth
FPS
encode time
decode time
```

Dynamic behavior:

```text
good network
→ increase quality

bad network
→ reduce bitrate

very bad network
→ reduce FPS/resolution
```

Expose quality state to UI.

---

# 21. REMOTE INPUT COORDINATE TRANSFORMATION

Remote screen and viewer dimensions may differ.

Implement:

```text
viewer coordinates
        ↓
normalized coordinates
        ↓
remote display coordinates
```

Support:

```text
scale
letterboxing
multi-monitor
different DPI
different display orientation
```

---

# 22. MULTI-MONITOR

Support:

```text
list displays
display resolution
display index
primary display
```

Remote UI:

```text
Display 1
Display 2
Display 3
```

User can switch display.

Do not assume only one monitor.

---

# 23. REMOTE CONTROL SECURITY

Default:

```text
screen view only
```

Mouse and keyboard require explicit approval.

Full control is never enabled silently.

When elevated privileges are required:

show clear UI.

Never bypass OS security boundaries.

Do not implement stealth UAC bypass.

---

# 24. FILE TRANSFER

Use chunked transfer.

Example:

```text
File
↓
Chunk 0
Chunk 1
Chunk 2
...
Chunk N
```

Each chunk:

```text
file_id
chunk_index
chunk_size
sha256
payload
```

Support:

```text
resume
pause
cancel
checksum
integrity verification
```

Use temporary storage.

Never trust client-provided file paths.

Prevent:

```text
../
..\
absolute path attacks
symlink attacks where applicable
```

---

# 25. CLIPBOARD

Support:

```text
text
image
```

Permission-controlled.

Show security option:

```text
Clipboard Sync
ON / OFF
```

Never transfer clipboard silently without a configured permission.

---

# 26. CHAT

Session chat:

```text
chat message
system message
AI message
file message
```

Persist messages.

Use pagination.

Do not load entire message history at once.

---

# 27. RECORDING

Recording architecture:

```text
Screen Frames
+
Session Metadata
↓
Recorder
↓
Encoder
↓
Storage
```

Use an appropriate video container such as:

```text
MP4
WebM
```

The exact implementation must respect codec availability.

Recording state:

```text
IDLE
RECORDING
STOPPING
COMPLETED
FAILED
```

Display visible recording state.

---

# 28. SYSTEM TELEMETRY

Collect only with explicit authorization.

Possible telemetry:

```text
OS
CPU
RAM
disk
network
GPU
processes
services
uptime
```

Define polling intervals.

Do not unnecessarily send high-frequency data.

Example:

```text
system metrics: 2 sec
process list: 5-10 sec
static hardware info: once
```

---

# 29. AI ARCHITECTURE

AI is a separate service.

Architecture:

```text
Desktop Agent
      │
      │ authorized diagnostics
      ▼
   AI Service
      │
      ├── OpenAI
      ├── Anthropic
      ├── Google
      ├── OpenRouter
      └── Ollama
```

Implement provider abstraction:

```typescript
interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
}
```

---

# 30. AI DATA MINIMIZATION

Do NOT send the entire computer state to the AI.

Only send:

```text
required diagnostic information
```

Redact:

```text
passwords
tokens
cookies
API keys
private keys
personal secrets
```

Implement secret scanning before sending diagnostic content.

---

# 31. AI DIAGNOSTICS

User asks:

```text
Why is this computer slow?
```

Pipeline:

```text
User question
↓
Permission check
↓
Collect diagnostics
↓
Normalize data
↓
Redact secrets
↓
AI analysis
↓
Structured response
```

AI response schema:

```json
{
  "summary": "...",
  "severity": "low|medium|high|critical",
  "findings": [],
  "possible_causes": [],
  "recommendations": [],
  "confidence": 0.0
}
```

AI output must be validated.

Never directly trust generated JSON.

---

# 32. AI SCREEN ANALYSIS

User can explicitly send:

```text
Analyze current screen
```

Capture one authorized frame.

Send only that frame.

AI returns:

```text
detected_problem
explanation
possible_causes
suggested_solution
confidence
```

Never continuously upload the screen to AI by default.

---

# 33. AI ACTION SYSTEM

NEVER allow:

```text
LLM → arbitrary shell → execute
```

Instead:

```text
LLM
↓
Structured Action Proposal
↓
Policy Validator
↓
User Approval
↓
Execution
↓
Result
↓
AI Explanation
```

Example:

```json
{
  "action": "restart_process",
  "target": "example.exe"
}
```

The policy layer checks whether the action is allowed.

---

# 34. ACTION ALLOWLIST

Create explicit safe actions.

Examples:

```text
get_system_info
get_disk_usage
get_process_list
restart_supported_application
clear_application_cache
open_system_settings
```

Dangerous actions require higher privileges and explicit confirmation.

Never permit arbitrary command injection.

---

# 35. AI COMMAND SAFETY

Reject actions involving:

```text
credential theft
keylogging
stealth persistence
security bypass
unauthorized privilege escalation
hidden remote access
malware behavior
data exfiltration
destructive commands
```

---

# 36. AI SESSION SUMMARY

At session end generate structured summary:

```text
Session duration
Issue
Diagnostics
Findings
Actions
Resolution
Unresolved issues
Confidence
```

Store summary in database.

---

# 37. AUDIT LOGGING

Audit security-sensitive events.

Examples:

```text
auth.login
auth.logout
device.created
device.revoked

session.created
session.approved
session.rejected
session.connected
session.ended

permission.granted
permission.revoked

file.started
file.completed
file.failed

command.proposed
command.approved
command.rejected
command.executed

recording.started
recording.stopped

ai.analysis.started
ai.analysis.completed
```

Audit log must be append-only from application perspective.

---

# 38. API DESIGN

Use REST for normal application operations.

Use WebSocket for real-time events.

Example REST:

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/devices
POST   /api/v1/devices
GET    /api/v1/devices/:id
DELETE /api/v1/devices/:id

POST   /api/v1/sessions
GET    /api/v1/sessions
GET    /api/v1/sessions/:id
POST   /api/v1/sessions/:id/approve
POST   /api/v1/sessions/:id/reject
POST   /api/v1/sessions/:id/end

GET    /api/v1/sessions/:id/events
GET    /api/v1/sessions/:id/files
POST   /api/v1/sessions/:id/files
GET    /api/v1/sessions/:id/messages

POST   /api/v1/ai/analyze
POST   /api/v1/ai/action-proposal
POST   /api/v1/ai/action-approval
```

---

# 39. API VALIDATION

Every API endpoint must:

```text
validate input
authorize user
verify resource ownership
apply rate limits
return typed errors
log security-sensitive operations
```

Use:

```text
Zod
```

for request validation.

---

# 40. ERROR FORMAT

Standardize:

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Remote session was not found",
    "requestId": "..."
  }
}
```

Do not leak stack traces to production clients.

---

# 41. WEBSOCKET SECURITY

On connection:

```text
authenticate
authorize
bind user
bind session
bind device
```

Reject clients attempting to subscribe to unauthorized sessions.

Implement heartbeat.

Implement timeout.

Implement graceful close.

---

# 42. RATE LIMITING

Apply limits for:

```text
login
registration
password reset
session creation
connection requests
AI requests
file transfer initialization
WebSocket connections
```

Use Redis-backed rate limiting.

---

# 43. OBSERVABILITY

Every request receives:

```text
requestId
traceId
```

Logs should include structured fields:

```text
timestamp
service
level
requestId
userId
deviceId
sessionId
event
duration
```

Metrics:

```text
active_sessions
connection_success_rate
connection_failure_rate
average_session_duration
webrtc_latency
packet_loss
file_transfer_rate
ai_requests
ai_latency
api_latency
```

---

# 44. ADMIN PANEL

Admin dashboard:

```text
Overview
Users
Organizations
Devices
Sessions
Security
AI Usage
Storage
Audit Logs
System Health
```

Charts:

```text
sessions/day
active devices
connection success rate
average latency
data transferred
AI requests
```

---

# 45. SECURITY CENTER

Create page:

```text
Security Center
```

Show:

```text
2FA
Active sessions
Trusted devices
Login history
API keys
Remote access policy
Clipboard policy
File transfer policy
AI permissions
```

---

# 46. DESKTOP SYSTEM TRAY

Tray:

```text
NexusDesk AI

Status: Online

Device ID
NXD-AB12-CD34

Open Dashboard
Security
Pause Remote Access
Settings
Exit
```

---

# 47. STARTUP

Allow configurable startup:

```text
Start with Windows
```

Do not force persistence.

User must control this setting.

---

# 48. DESKTOP PERMISSION MODEL

Desktop permission manager:

```text
Remote Access
Screen
Mouse
Keyboard
Clipboard
Files
Diagnostics
AI
Recording
```

Each can be:

```text
Always allowed
Ask every time
Disabled
```

Store securely.

---

# 49. CONNECTION UX

Incoming request:

```text
Incoming Remote Connection

User:
Naimjon

Device:
Laptop

Requested permissions:

✓ Screen
✓ Mouse
✓ Keyboard
□ Clipboard
□ File Transfer
□ Diagnostics

[Reject]

[Accept]
```

Show countdown:

```text
Request expires in 28 sec
```

---

# 50. REMOTE VIEWER UI

Design:

```text
┌──────────────────────────────────────────────┐
│ NexusDesk AI       Connected ●       42 ms   │
├──────────────────────────────────────────────┤
│                                              │
│                                              │
│             REMOTE DISPLAY                  │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│ Mouse │ Keyboard │ Files │ Chat │ AI │ More │
└──────────────────────────────────────────────┘
```

Toolbar must not obstruct remote display unnecessarily.

---

# 51. AI PANEL

AI panel:

```text
┌─────────────────────────────┐
│ AI Support                  │
├─────────────────────────────┤
│ Analyze this computer       │
│                             │
│ Why is the CPU high?        │
│ Is this process suspicious? │
│ Analyze this error          │
│                             │
│ ─────────────────────────── │
│ Findings                    │
│                             │
│ CPU usage: 91%              │
│ Chrome: 4.8 GB RAM          │
│                             │
│ Recommendations             │
│                             │
│ [View processes]            │
└─────────────────────────────┘
```

---

# 52. STATE MANAGEMENT

Use state machines for complex states.

Avoid one giant global state.

Separate:

```text
auth
devices
sessions
connection
permissions
remoteViewer
chat
files
ai
settings
```

---

# 53. TYPE SAFETY

Strict TypeScript:

```json
{
  "strict": true
}
```

No:

```typescript
any;
```

unless absolutely unavoidable and documented.

Rust:

```text
#![deny(unsafe_op_in_unsafe_fn)]
```

and minimize unsafe code.

Unsafe code must have comments explaining why it is necessary.

---

# 54. TESTING STRATEGY

## Unit tests

Test:

```text
crypto
protocol
validation
permissions
state machines
database services
AI response parsing
```

---

## Integration tests

Test:

```text
auth → DB
API → DB
API → Redis
signaling → Redis
session lifecycle
permission lifecycle
file transfer metadata
```

---

## End-to-end

Use:

```text
Playwright
```

Test:

```text
registration
login
device creation
session request
session approval
session termination
```

---

# 55. NETWORK TESTING

Simulate:

```text
low bandwidth
high latency
packet loss
disconnect
reconnect
NAT failure
TURN fallback
```

Expected behavior must be documented.

---

# 56. SECURITY TESTING

Test:

```text
unauthorized device
expired JWT
replayed token
permission escalation
session takeover
path traversal
malformed WebSocket messages
oversized packets
rate-limit abuse
invalid AI action
command injection attempts
```

---

# 57. LOAD TESTING

Create load tests for:

```text
authentication
device presence
signaling
session creation
chat
AI requests
```

Do not test only static API endpoints.

---

# 58. DOCKER DEVELOPMENT

docker-compose services:

```text
postgres
redis
coturn
api
signaling
ai
worker
minio
prometheus
grafana
loki
```

Command:

```bash
docker compose up -d
```

---

# 59. ENVIRONMENT VARIABLES

Create:

```text
.env.example
.env.development
```

Never commit real secrets.

Example:

```env
DATABASE_URL=
REDIS_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=

TURN_HOST=
TURN_PORT=
TURN_USERNAME=
TURN_PASSWORD=

S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
OPENROUTER_API_KEY=

OLLAMA_BASE_URL=
```

---

# 60. SECRET MANAGEMENT

API keys must never be:

```text
sent to browser
logged
stored in frontend bundle
stored in localStorage
exposed to remote client
```

Use server-side provider abstraction.

---

# 61. MIGRATIONS

Every schema change must use Prisma migrations.

Never manually modify the production database schema.

---

# 62. DATA RETENTION

Configurable retention:

```text
session history
audit logs
recordings
AI conversations
file-transfer metadata
```

Implement deletion jobs.

---

# 63. BACKGROUND WORKERS

Use worker process for:

```text
recording processing
AI summaries
cleanup
file lifecycle
analytics
notification jobs
```

Use Redis/BullMQ or equivalent.

---

# 64. NOTIFICATION SYSTEM

Support internal notifications:

```text
incoming connection
session ended
AI analysis ready
file transfer completed
security warning
```

---

# 65. DEVICE PRESENCE

Device sends heartbeat:

```text
device.online
```

Every configurable interval.

Server determines:

```text
online
offline
stale
```

Do not depend solely on frontend polling.

---

# 66. CONNECTION QUALITY

Calculate:

```text
latency
packet loss
jitter
bandwidth
```

Display:

```text
Excellent
Good
Fair
Poor
```

---

# 67. SESSION TELEMETRY

Store aggregate metrics.

Do not permanently store every low-level packet.

Example:

```text
avg_latency
max_latency
packet_loss
peak_bitrate
avg_fps
```

---

# 68. VERSIONED PROTOCOL

Protocol version:

```text
1
```

Every session handshake includes:

```text
client_version
protocol_version
capabilities
```

Negotiate features.

Example:

```json
{
  "protocolVersion": 1,
  "capabilities": ["screen.h264", "input.v1", "clipboard.v1", "file-transfer.v1"]
}
```

---

# 69. COMPATIBILITY

If capability mismatch exists:

```text
negotiate compatible subset
```

Do not crash.

Return meaningful error.

---

# 70. AUTO UPDATE

Desktop client architecture should support signed application updates.

Never install unsigned update payloads.

Verify package signature before update.

---

# 71. CRASH REPORTING

Create crash reporting architecture.

Never send sensitive data automatically.

Include:

```text
app version
OS
architecture
crash type
stack
sanitized metadata
```

---

# 72. OFFLINE MODE

Desktop must be able to:

```text
start
show device identity
show local configuration
collect local diagnostics
```

When network returns:

```text
reconnect
re-authenticate
update presence
```

---

# 73. CONFIGURATION

Desktop configuration:

```text
Remote Access
Security
Performance
Network
Display
Clipboard
Files
AI
Recording
Updates
```

---

# 74. PERFORMANCE REQUIREMENTS

Target:

```text
CPU idle:
low

RAM:
reasonable for desktop utility

connection startup:
fast

remote input:
low latency

screen stream:
30 FPS target

UI:
60 FPS where possible
```

Do not optimize prematurely.

Measure first.

---

# 75. REDUCING SCREEN BANDWIDTH

Implement dirty-region or equivalent optimization where useful.

Potential pipeline:

```text
screen frame
↓
detect changed areas
↓
encode changed regions
↓
transport
```

Do not transmit identical frames unnecessarily.

---

# 76. AI COST CONTROL

AI requests must have:

```text
rate limit
token limit
provider timeout
retry policy
cost tracking
```

Store usage:

```text
provider
model
input_tokens
output_tokens
latency
estimated_cost
session_id
user_id
```

---

# 77. AI PROVIDER FALLBACK

Provider strategy:

```text
Primary
↓
timeout/error
↓
Fallback provider
↓
local Ollama if configured
```

Never loop infinitely.

---

# 78. AI RESPONSE VALIDATION

AI output must use JSON schema validation.

Example:

```text
Zod schema
↓
parse
↓
validate
↓
reject invalid
```

If invalid:

```text
retry once with repair instruction
```

Then fail safely.

---

# 79. AI HALLUCINATION CONTROL

AI must distinguish:

```text
observed
inferred
unknown
```

Example:

```json
{
  "observed": ["CPU utilization is 92%"],
  "inferred": ["A CPU-heavy process may be responsible"],
  "unknown": ["Whether the process is malicious"]
}
```

Never present assumptions as facts.

---

# 80. AI CONFIDENCE

Do not let model fabricate numerical confidence.

Either:

- omit confidence
- or calculate confidence using a documented deterministic method

Do not blindly trust:

```text
confidence: 97%
```

generated by LLM.

---

# 81. COMMAND EXECUTION POLICY

Create policy engine:

```text
Action
↓
Permission
↓
Risk level
↓
Policy
↓
User approval
↓
Execution
```

Risk levels:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Only allow automatic execution for explicitly configured LOW-risk actions.

---

# 82. COMMAND RESULT

Store:

```text
action
parameters
requested_by
approved_by
timestamp
execution_status
result
duration
```

Never store secrets in raw result logs.

---

# 83. FILE STORAGE

Store large files in object storage.

Database stores metadata.

Example:

```text
PostgreSQL
→ metadata

S3/MinIO
→ binary objects
```

---

# 84. SIGNED DOWNLOADS

For object storage:

Generate short-lived signed URLs.

Never expose permanent bucket credentials.

---

# 85. SESSION RECORDING STORAGE

Store recordings with:

```text
private object
short-lived access URL
retention policy
owner
session ID
```

---

# 86. ADMIN SECURITY

Admin routes require:

```text
ADMIN role
```

Add:

```text
2FA
audit logging
rate limiting
IP anomaly detection architecture
```

---

# 87. FRONTEND SECURITY

Prevent:

```text
XSS
CSRF
open redirects
unsafe HTML
token leakage
```

Sanitize rendered content.

Never inject AI output as raw HTML.

---

# 88. DESKTOP SECURITY

Never trust remote data.

Every incoming protocol message:

```text
parse
validate
authorize
execute
```

not:

```text
receive → execute
```

---

# 89. REMOTE ACCESS DEFAULTS

Recommended defaults:

```text
Remote Access:
Enabled

Auto Accept:
OFF

Screen:
Ask

Keyboard:
Ask

Mouse:
Ask

Clipboard:
OFF

Files:
OFF

AI:
Ask

Recording:
Ask
```

---

# 90. UX ERROR STATES

Every network operation needs:

```text
loading
success
retryable error
fatal error
timeout
cancelled
```

Provide meaningful user messages.

---

# 91. LOGGING POLICY

Never log:

```text
password
JWT
refresh token
private key
API key
clipboard contents
file contents
full AI secrets
```

---

# 92. DOCUMENTATION

Create:

```text
README.md
ARCHITECTURE.md
PROTOCOL.md
SECURITY.md
API.md
DATABASE.md
AI.md
DESKTOP.md
NETWORKING.md
DEPLOYMENT.md
TESTING.md
TROUBLESHOOTING.md
```

Include Mermaid diagrams.

---

# 93. DEVELOPMENT PHASES

Do not attempt the whole system at once.

Implement in this exact sequence.

---

## PHASE 0 — ARCHITECTURAL FOUNDATION

Create:

```text
monorepo
packages
apps
services
Docker
lint
format
CI
type checking
```

Deliverable:

All services compile.

---

## PHASE 1 — AUTH + DEVICE REGISTRATION

Implement:

```text
registration
login
JWT
refresh
2FA foundation
desktop registration
device identity
device heartbeat
device dashboard
```

Acceptance:

A real desktop agent can register and appear ONLINE.

---

## PHASE 2 — SIGNALING

Implement:

```text
WebSocket
session creation
incoming request
approval
rejection
heartbeat
session lifecycle
```

Acceptance:

Two real desktop clients can negotiate a session.

---

## PHASE 3 — WEBRTC

Implement:

```text
STUN
ICE
TURN
peer connection
data channels
reconnect
```

Acceptance:

Two machines establish an actual peer connection.

---

## PHASE 4 — SCREEN STREAMING

Implement:

```text
native screen capture
encoding
WebRTC video transport
viewer
FPS
quality adaptation
```

Acceptance:

Machine A sees the live screen of machine B.

---

## PHASE 5 — REMOTE INPUT

Implement:

```text
mouse
keyboard
permissions
coordinate conversion
multi-monitor
```

Acceptance:

Machine A can control machine B after explicit approval.

---

## PHASE 6 — FILES + CLIPBOARD

Implement:

```text
chunked file transfer
resume
checksums
clipboard
```

Acceptance:

Real file can move between two computers.

---

## PHASE 7 — CHAT + RECORDING

Implement:

```text
session chat
recording
storage
playback
```

---

## PHASE 8 — DIAGNOSTICS

Implement:

```text
CPU
RAM
disk
network
processes
OS info
```

---

## PHASE 9 — AI

Implement:

```text
AI abstraction
provider adapters
diagnostic analysis
screen analysis
action proposals
approval
session summary
```

---

## PHASE 10 — SECURITY HARDENING

Perform:

```text
threat modeling
penetration-style testing
permission testing
protocol fuzzing
rate-limit testing
auth testing
path traversal testing
```

---

## PHASE 11 — OBSERVABILITY

Implement:

```text
metrics
tracing
logs
Grafana
Prometheus
health checks
```

---

## PHASE 12 — PRODUCTION PACKAGING

Implement:

```text
desktop installer
signed update architecture
Docker production config
reverse proxy
TLS
backup
monitoring
deployment documentation
```

---

# 94. DEFINITION OF DONE

A phase is DONE only when all are true:

```text
[ ] code implemented
[ ] types compile
[ ] tests pass
[ ] integration test exists
[ ] errors handled
[ ] logging implemented
[ ] documentation updated
[ ] no TODO for core functionality
[ ] manually verifiable
```

---

# 95. AGENT WORKFLOW

For every task:

```text
1. Inspect repository
2. Understand existing architecture
3. Identify dependencies
4. Modify smallest safe surface
5. Implement
6. Run formatter
7. Run linter
8. Run type checker
9. Run unit tests
10. Run integration tests
11. Fix failures
12. Update documentation
13. Verify manually
```

Never blindly rewrite the entire repository.

---

# 96. WHEN A NATIVE FEATURE IS DIFFICULT

Do NOT replace it with a fake implementation.

Instead:

```text
1. investigate native API
2. identify exact capability
3. create abstraction
4. implement platform-specific adapter
5. integrate through Tauri/Rust
6. test on target OS
```

If unavailable:

```text
STATUS:
BLOCKED

Reason:
...

Required dependency:
...

Native API:
...

Next implementation step:
...
```

---

# 97. CODING STYLE

Prefer:

```text
small modules
explicit interfaces
dependency inversion
typed errors
pure functions where practical
immutable data where practical
```

Avoid:

```text
god classes
god components
god services
global mutable state
hidden side effects
```

---

# 98. COMMIT STRUCTURE

Use logical commits:

```text
feat(auth): implement authentication
feat(device): implement device registration
feat(signaling): implement session signaling
feat(webrtc): implement peer connection
feat(remote): implement screen streaming
feat(input): implement remote input
feat(files): implement file transfer
feat(ai): implement diagnostics assistant
fix(security): prevent permission escalation
```

---

# 99. CI PIPELINE

On every push:

```text
install
lint
typecheck
unit tests
integration tests
build
security audit
```

Do not allow broken main branch.

---

# 100. BUILD COMMANDS

Provide working commands:

```bash
pnpm install

pnpm dev

pnpm build

pnpm test

pnpm lint

pnpm typecheck

docker compose up -d
```

Document exactly what each command starts.

---

# 101. LOCAL DEVELOPMENT

Expected local environment:

```text
Windows machine
Node.js
pnpm
Rust
Tauri prerequisites
Docker Desktop
```

Create setup script where practical.

---

# 102. HEALTH CHECKS

Services expose:

```text
/health
/ready
```

Health checks verify:

```text
database
redis
object storage
AI providers where configured
```

---

# 103. SECURITY THREAT MODEL

Document threats:

```text
unauthorized remote access
session hijacking
MITM
replay attack
device impersonation
permission escalation
malicious file transfer
AI prompt injection
command injection
credential leakage
TURN abuse
DoS
```

For each:

```text
threat
impact
mitigation
residual risk
```

---

# 104. AI PROMPT INJECTION DEFENSE

Remote computer content may contain malicious instructions.

Example:

```text
malicious webpage text
malicious log text
malicious filenames
```

Treat all remote data as UNTRUSTED CONTENT.

Never allow remote content to override system instructions.

Architecture:

```text
System instructions
>
Policy
>
User request
>
Remote machine content
```

---

# 105. SECURITY BOUNDARY

Treat these as untrusted:

```text
remote screen
remote files
remote logs
remote process names
remote clipboard
AI output
WebSocket payloads
desktop input
```

Validate everything.

---

# 106. PRODUCT ANALYTICS

Track aggregate product metrics:

```text
daily active users
active devices
sessions
successful connections
average duration
average latency
file transfer volume
AI usage
```

Do not collect unnecessary personal data.

---

# 107. LANDING PAGE

Create professional landing page.

Sections:

```text
Hero
Features
How it works
AI Support
Security
Performance
Use Cases
Pricing placeholder
FAQ
CTA
```

Do not claim certifications the product does not possess.

---

# 108. PORTFOLIO PRESENTATION

The project must demonstrate:

```text
Distributed Systems
Networking
WebRTC
Rust
Tauri
TypeScript
React
PostgreSQL
Redis
Docker
Security
AI
Observability
```

README should include architecture diagram and screenshots.

---

# 109. DEMO MODE

Create controlled demo environment.

Demo must use:

```text
explicitly authorized test machines
```

Never automatically expose production remote access.

---

# 110. IMPORTANT SAFETY AND SECURITY LIMITS

This application is legitimate remote-support software.

Never implement:

```text
stealth mode intended to hide remote access
credential theft
keylogging
hidden persistence
bypass of OS security
UAC bypass
AV/EDR evasion
unauthorized access
silent installation on third-party machines
```

Remote sessions must be visible and permission-controlled.

---

# 111. FINAL DELIVERY

When development reaches a stable state, generate:

```text
README.md
ARCHITECTURE.md
SECURITY.md
PROTOCOL.md
API.md
DEPLOYMENT.md
TESTING.md
```

Also provide:

```text
architecture diagram
database diagram
sequence diagrams
setup instructions
known limitations
roadmap
```

---

# 112. MOST IMPORTANT INSTRUCTION

DO NOT optimize for producing a large amount of code quickly.

Optimize for:

```text
correctness
security
real networking
real native integration
testability
maintainability
observability
production architecture
```

When uncertain, inspect existing implementation and verify assumptions before coding.

When a feature requires native operating-system APIs, implement the native layer instead of replacing it with JavaScript simulation.

When a feature requires networking, implement actual networking instead of mocked state.

When a feature requires AI, integrate an actual provider abstraction.

When a feature requires authorization, enforce it at every security boundary.

Build incrementally.

Test continuously.

Never claim success without verification.

---

# FIRST TASK

Do ONLY Phase 0.

Before writing application features:

1. Inspect the environment.
2. Verify installed Node.js version.
3. Verify pnpm.
4. Verify Rust.
5. Verify Tauri prerequisites.
6. Verify Docker.
7. Create the monorepo.
8. Create workspace configuration.
9. Create base packages.
10. Create base services.
11. Create linting.
12. Create formatting.
13. Create TypeScript configuration.
14. Create Rust workspace configuration where appropriate.
15. Create Docker Compose infrastructure.
16. Create CI configuration.
17. Create README.
18. Run all checks.

At the end output:

```text
PHASE 0 REPORT

Environment:
...

Created:
...

Build:
PASS/FAIL

Lint:
PASS/FAIL

Typecheck:
PASS/FAIL

Tests:
PASS/FAIL

Docker:
PASS/FAIL

Known Issues:
...

Next Phase:
PHASE 1 — AUTH + DEVICE REGISTRATION
```

Do not implement Phase 1 until Phase 0 is verified.
