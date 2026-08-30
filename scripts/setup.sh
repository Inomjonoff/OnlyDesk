#!/usr/bin/env bash
set -e

echo "=== Setting up NexusDesk AI Monorepo ==="

if command -v node &> /dev/null; then
    echo "[✓] Node.js found: $(node -v)"
else
    echo "[✗] Node.js is required but not found in PATH."
    exit 1
fi

if command -v pnpm &> /dev/null; then
    echo "[✓] pnpm found: $(pnpm -v)"
else
    echo "[!] pnpm not found. Installing via npm..."
    npm install -g pnpm
fi

echo "Installing workspace dependencies..."
pnpm install

echo "[✓] Monorepo setup complete!"
