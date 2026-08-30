# AI Session Copilot & Safety Boundaries

## Safe Computer Use & Diagnostics

NexusDesk AI includes an integrated AI Copilot designed to assist technicians and users in troubleshooting system errors.

### Safety Rules:
1. **No Arbitrary Shell**: The AI cannot run arbitrary Command Prompt, PowerShell, or Bash commands.
2. **Explicit Tool Allowlist**: The AI only interacts through audited diagnostic tools (`get_cpu_usage`, `get_memory_usage`, `open_application`).
3. **Human-in-the-Loop**: Every proposed change requires an explicit 60-second single-use approval token.
4. **Emergency Stop**: The host can press **STOP AI** at any moment to cancel active control leases.
