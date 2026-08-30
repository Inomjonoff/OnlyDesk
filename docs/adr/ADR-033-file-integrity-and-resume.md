# ADR-033: Streaming SHA-256 Checksums, Cumulative ACKs & Checkpoint Resume

## Status

Accepted

## Context

Transferring multi-gigabyte files across unpredictable internet connections requires corruption detection and the ability to resume after network interruptions without restarting from byte zero.

## Decision

1. **Streaming SHA-256 Hashes**: Hashes are computed progressively per chunk and over the entire file stream without loading the full file into memory.
2. **Cumulative ACKs**: Receivers acknowledge contiguous chunk arrivals to maintain low protocol overhead while tracking recovery checkpoints.
3. **Resumable Checkpoints**: Interrupted transfers resume from the highest contiguous verified chunk index (`highestContiguousChunk + 1`).
