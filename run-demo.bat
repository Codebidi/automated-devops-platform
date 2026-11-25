@echo off
title DeployHub - CI/CD Demo Platform (Mock Data Mode)
cd /d "%~dp0cicd-dashboard"
echo ========================================================
echo   DeployHub - Starting Demo in Mock Data Mode
echo ========================================================
echo.
echo 1. Checking build...
if not exist "dist" (
    echo Building dashboard assets...
    call npm.cmd run build
)
echo.
echo 2. Launching Demo Web Server on http://localhost:8080 ...
start "" "http://localhost:8080"
call node_modules\.bin\vite.cmd preview --port 8080 --host
pause
