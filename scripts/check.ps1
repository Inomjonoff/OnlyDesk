# NexusDesk AI - Comprehensive Phase Check Script
Write-Host "=== Running NexusDesk AI Verification Suite ===" -ForegroundColor Cyan

Write-Host "`n1. Running Typecheck..." -ForegroundColor Yellow
& pnpm.cmd typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Typecheck failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Running Unit Tests..." -ForegroundColor Yellow
& pnpm.cmd test
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Tests failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Running Build..." -ForegroundColor Yellow
& pnpm.cmd build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n[✓] All Phase 0 checks passed successfully!" -ForegroundColor Green
