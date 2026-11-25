# DeployHub - Launch Demo in Mock Mode
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   DeployHub - Starting Demo in Mock Data Mode          " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location "$PSScriptRoot\cicd-dashboard"

if (-not (Test-Path "dist")) {
    Write-Host "Building dashboard..." -ForegroundColor Yellow
    & npm.cmd run build
}

Write-Host "`nLaunching Demo Web Server on http://localhost:8080 ..." -ForegroundColor Green
Start-Process "http://localhost:8080"
& .\node_modules\.bin\vite.cmd preview --port 8080 --host
