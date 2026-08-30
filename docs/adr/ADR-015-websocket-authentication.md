# ADR-015: WebSocket Authentication & Identity Binding

## Status

Accepted

## Context

Signaling sockets handle sensitive operations (approving device access, exchanging cryptographic credentials). Anonymous or unverified socket connections present high security risks (session hijacking, device spoofing).

## Decision

1. **Short-Lived Access Credential**: Clients must supply a valid JWT access token either during the initial HTTP upgrade handshake or via an immediate `connection.authenticate` command.
2. **Dual Identity Binding**: Every authenticated socket connection binds two distinct identities:
   - `userId` (authoritative identity extracted from JWT claims)
   - `deviceId` (optional hardware agent identity confirmed via keystore)
3. **Strict Authorization**: Unauthenticated sockets cannot issue commands or subscribe to session channels. Replayed or forged device IDs are rejected.

## Security Implications

- Refresh tokens are never passed over WebSocket URLs.
- Failed authentication closes the connection and records security metrics.
