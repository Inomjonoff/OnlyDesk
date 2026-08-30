# ADR-042: Recording Lifecycle, Retention Policies & Secure Deletion

## Status

Accepted

## Context

Video files accumulate significant storage over time. Organizations require configurable retention windows (e.g. 30 days) and verified deletion mechanisms.

## Decision

1. **Configurable Retention**: Recordings are assigned an `expiresAt` timestamp based on `RECORDING_RETENTION_DAYS`.
2. **Background Retention Worker**: A periodic worker scans for expired recordings, purges the binary objects from object storage, and updates the metadata state to `EXPIRED`.
3. **Verified Deletion**: Deletion requests remove the object storage file first; if storage deletion fails, the metadata record is not marked `DELETED`, preventing orphaned state.
