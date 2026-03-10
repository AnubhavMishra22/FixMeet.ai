# FixMeet.ai - Run full Droplet setup remotely
# Usage: .\run-droplet-setup.ps1 -Password "your_root_password"
# Or:   $env:DROPLET_PW='your_password'; .\run-droplet-setup.ps1

param(
    [string]$Password = $env:DROPLET_PW,
    [string]$IP = "137.184.38.130"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$setupScript = Join-Path $scriptDir "droplet-full-setup.sh"

if (-not $Password) {
    Write-Host "Usage: .\run-droplet-setup.ps1 -Password 'your_root_password'" -ForegroundColor Yellow
    Write-Host "Or set: `$env:DROPLET_PW='your_password'" -ForegroundColor Yellow
    exit 1
}

$plink = "C:\Program Files\PuTTY\plink.exe"
if (-not (Test-Path $plink)) {
    Write-Host "Plink not found. Install PuTTY or run the setup manually:" -ForegroundColor Red
    Write-Host "  1. scp scripts/droplet-full-setup.sh root@${IP}:~/" -ForegroundColor Cyan
    Write-Host "  2. ssh root@${IP}" -ForegroundColor Cyan
    Write-Host "  3. bash droplet-full-setup.sh" -ForegroundColor Cyan
    exit 1
}

# Accept host key on first connection (SHA256:Q2GtJVYp22Ok8nHDh/B0utFZp3MlPtVaKii+FpOo0s0)
$hostKey = "SHA256:Q2GtJVYp22Ok8nHDh/B0utFZp3MlPtVaKii+FpOo0s0"

Write-Host "Uploading setup script..." -ForegroundColor Cyan
$scp = "C:\Program Files\PuTTY\pscp.exe"
if (Test-Path $scp) {
    & $scp -pw $Password -hostkey $hostKey $setupScript "root@${IP}:~/droplet-full-setup.sh"
} else {
    $content = Get-Content $setupScript -Raw
    $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($content))
    & $plink -pw $Password -batch -hostkey $hostKey root@$IP "echo $b64 | base64 -d > droplet-full-setup.sh"
}

Write-Host "Running setup on Droplet (this may take 5-10 min)..." -ForegroundColor Cyan
& $plink -pw $Password -batch -hostkey $hostKey root@$IP "bash droplet-full-setup.sh"

Write-Host "`nDone! Backend should be running at http://${IP}" -ForegroundColor Green
