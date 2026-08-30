# ADR-040: Private Object Storage, SHA-256 Verification & Signed Playback URLs

## Status

Accepted

## Context

Video recordings are large binary assets containing confidential visual data. They must never be stored directly in PostgreSQL or exposed through publicly accessible URLs.

## Decision

1. **Private S3/MinIO Storage**: Recordings are staged in temporary local disk directories and uploaded asynchronously to private object storage under `recordings/{recordingId}/...`.
2. **Whole-Artifact Integrity**: Streaming SHA-256 hashes are computed and verified before and after upload.
3. **Short-Lived Signed URLs**: Playback and downloads require authenticated requests to `GET /api/v1/recordings/:id/playback-url`, which returns a time-limited signed URL (15-minute TTL). Permanent bucket credentials are never exposed to clients.
