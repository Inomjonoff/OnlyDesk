# Troubleshooting & Diagnostic Support

## Common Issues & Solutions

### 1. WebRTC Connection Fails (STUN/TURN)
- Verify outbound UDP port 3478 is not blocked by your firewall.
- If behind a corporate proxy, check that WebSockets (`wss://signal.nexusdesk.uz`) are permitted.

### 2. Black Screen or Capture Stalled
- Ensure Windows Graphics Driver is up to date.
- Restart the NexusDesk desktop client from the system tray.

### 3. Submitting Diagnostic Reports
- Open `/help` in the dashboard or click *Help → Export Diagnostic Bundle* in the desktop client.
- Copy the redacted bundle and share it with your support representative.
