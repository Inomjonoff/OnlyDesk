# ADR-029: Keyboard Physical Key Mapping & Modifier State Engine

## Status

Accepted

## Context

Physical keyboard layouts vary across languages (QWERTY, AZERTY, QWERTZ, Dvorak). Relying purely on translated characters breaks hotkeys, modifier key combinations, and game navigation.

## Decision

1. **Physical Key Identity**: Use W3C `KeyboardEvent.code` (e.g. `KeyA`, `Digit1`, `ShiftLeft`, `ControlLeft`) as primary physical scan identifiers.
2. **Modifier State Synchronization**: Track Shift, Ctrl, Alt, Meta independently on both viewer and host.
3. **No Keylogging**: Keystrokes are processed strictly in volatile memory for native injection and never logged, persisted in databases, or stored in audit logs.
