# Privacy & Data Handling Policy

## What Leaves Your Device?
- **Video & Input**: Streamed directly peer-to-peer via WebRTC whenever direct connectivity is possible, or through an encrypted TURN relay when symmetric NAT requires it.
- **Recordings**: Stored only when both parties explicitly consent. Uploaded to private encrypted object storage with time-limited signed URLs.
- **AI Diagnostics**: Only single-frame screen grabs (upon direct user request) and filtered system diagnostics (CPU, RAM, top processes).
- **Redaction Engine**: AWS keys, JWTs, SSH private keys, database connection strings, and passwords are automatically scrubbed locally before diagnostic data leaves your machine.
