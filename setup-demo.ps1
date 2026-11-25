# setup-demo.ps1 - Automated setup for ai-devops-platform demo (mock mode)
# Requires administrative privileges for some steps.

function Enable-WSL2 {
    Write-Host "Enabling WSL and Virtual Machine Platform..."
    # Enable required Windows features
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Null
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null
    Write-Host "Features enabled. A reboot is required to finalize WSL installation."
    $reboot = Read-Host "Reboot now? (y/n)"
    if ($reboot -eq 'y') { Restart-Computer }
}

function Install-Ubuntu {
    Write-Host "Installing Ubuntu distribution for WSL..."
    # This will download and install the default Ubuntu from the Microsoft Store.
    wsl --install -d Ubuntu
    Write-Host "Ubuntu installed. Setting version 2 as default."
    wsl --set-default-version 2
}

function Install-DockerDesktop {
    $installerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    $installerPath = "$env:TEMP\DockerDesktopInstaller.exe"
    Write-Host "Downloading Docker Desktop..."
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
    Write-Host "Running Docker Desktop installer (requires admin)..."
    Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet" -Verb RunAs -Wait
    Remove-Item $installerPath -Force
}

function Fix-DockerACL {
    $configPath = "$env:USERPROFILE\.docker\config.json"
    if (Test-Path $configPath) {
        Write-Host "Fixing ACL on $configPath"
        icacls $configPath /grant "$env:USERNAME:(R)" | Out-Null
    }
}

function Wait-ForDockerDaemon {
    Write-Host "Waiting for Docker daemon to become ready..."
    $max = 120
    $elapsed = 0
    while ($true) {
        Start-Sleep -Seconds 3
        $elapsed += 3
        $out = docker version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker daemon ready after $elapsed seconds."
            break
        }
        if ($elapsed -ge $max) {
            Write-Error "Docker daemon not reachable after $max seconds."
            exit 1
        }
        Write-Host "   waiting… ($elapsed s)"
    }
}

function Run-Compose {
    $projectDir = "$(Resolve-Path .)"
    Set-Location $projectDir
    Write-Host "Starting docker-compose..."
    docker-compose up
}

# Main execution flow
Write-Host "=== ai-devops-platform demo setup (mock mode) ==="

# Step 1: Ensure WSL2
if (-not (wsl -l -v 2>$null)) {
    Enable-WSL2
    Install-Ubuntu
} else {
    Write-Host "WSL already installed."
}

# Step 2: Ensure Docker Desktop
if (-not (Test-Path "C:\Program Files\Docker\Docker\Docker Desktop.exe")) {
    Install-DockerDesktop
} else {
    Write-Host "Docker Desktop already installed."
}

# Step 3: Start Docker Desktop (if not already running)
$dockerProcess = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $dockerProcess) {
    Write-Host "Launching Docker Desktop..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
}

# Step 4: Fix ACL if necessary
Fix-DockerACL

# Step 5: Wait for daemon
Wait-ForDockerDaemon

# Step 6: Verify .env has USE_MOCK=true (already set in repository)
# (User can edit manually if needed)

# Step 7: Run the compose stack
Run-Compose

Write-Host "Demo should now be reachable at http://localhost:8080"

