# Frequently Asked Questions (FAQ)

### Is NexusDesk free?
Yes, during the Public Beta, NexusDesk is free for registered community users up to our documented demo quotas.

### Does the server see my screen?
No. Media streams are encrypted end-to-end between your computer and the remote technician via WebRTC (DTLS-SRTP). When a TURN relay is used to traverse strict firewalls, the relay only transports encrypted UDP/TCP packets and cannot inspect the screen content.

### What does the AI see?
The AI only observes diagnostic telemetry that you approve, and single screen captures when you explicitly trigger vision diagnostics. Continuous video streaming to the AI is prohibited.

### Can AI control my PC autonomously?
No. AI Computer Use is strictly gated behind short-lived control leases (max 5 actions, 30s expiry), coordinate normalization, and human-in-the-loop approval. You can hit **STOP AI** at any second.
