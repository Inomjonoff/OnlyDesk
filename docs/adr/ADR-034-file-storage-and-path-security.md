# ADR-034: Temporary Part Files, Path Traversal Defense & Atomic Finalization

## Status

Accepted

## Context

Writing untrusted remote files directly to destination filenames risks directory traversal vulnerabilities (`../`, `..\`, absolute paths, UNC paths) and leaves partially downloaded or corrupted files visible on disk.

## Decision

1. **Strict Sanitization**: Filenames are strictly sanitized, rejecting path traversal tokens, control characters, and reserved system characters.
2. **Temporary Part Files**: Active downloads write to an isolated temporary `.nexusdesk-transfer-{id}.part` file.
3. **Atomic Rename Finalization**: The file is atomically moved to its final destination name only after successful whole-file SHA-256 verification.
4. **Collision Handling**: Existing files are never silently overwritten; unique names (`file (1).ext`) are automatically assigned.
