# ADR-028: Normalized Coordinate Transformation & Letterbox Compensation

## Status

Accepted

## Context

Remote viewers and host desktops operate across varying monitor resolutions, aspect ratios (16:9, 16:10, ultrawide), viewport sizes, and OS DPI scaling factors (100% to 200%).

## Decision

1. **Normalized Space `[0, 1]`**: Pointer coordinates are transmitted in normalized floating-point format relative to the active video content rectangle.
2. **Letterbox & Pillarbox Rejection**: Coordinate mapper calculates exact active video bounds in `contain`, `cover`, `fit`, and `100%` modes, rejecting clicks occurring in black bar letterbox areas.
3. **Host DPI Mapping**: Normalized coordinates are translated into host physical pixels at the native OS injection boundary.
