# NexusDesk AI - Setup Script (Windows PowerShell)
Write-Host "=== Setting up NexusDesk AI Monorepo ===" -ForegroundColor Cyan

# Check Node
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Host "[✓] Node.js found: $nodeVer" -ForegroundColor Green
} else {
    Write-Host "[✗] Node.js is required but not found in PATH." -ForegroundColor Red
}

# Install dependencies via pnpm.cmd
Write-Host "`nInstalling dependencies with pnpm..." -ForegroundColor Yellow
& pnpm.cmd install

Write-Host "`n[✓] Monorepo setup complete! Run 'pnpm.cmd dev' to start development services." -ForegroundColor Green
