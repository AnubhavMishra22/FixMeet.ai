# FixMeet.ai - Run full Droplet setup remotely
# Uses native SSH (key-based auth). Ensure your SSH key is added to the Droplet.
# Usage: .\run-droplet-setup.ps1 -IP "YOUR_DROPLET_IP"
#
# Prerequisites: ssh and scp (built into Windows 10+). Configure SSH keys first:
#   ssh-copy-id root@YOUR_DROPLET_IP
# Or add your public key to the Droplet during creation.

param(
    [Parameter(Mandatory = $true)]
    [string]$IP
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$setupScript = Join-Path $scriptDir "droplet-full-setup.sh"

# Prefer native ssh/scp (no password on command line, uses SSH keys)
$sshPath = Get-Command ssh -ErrorAction SilentlyContinue
$scpPath = Get-Command scp -ErrorAction SilentlyContinue

if (-not $sshPath -or -not $scpPath) {
    Write-Host "Native ssh/scp not found. Run setup manually:" -ForegroundColor Red
    Write-Host "  1. scp scripts/droplet-full-setup.sh root@${IP}:~/" -ForegroundColor Cyan
    Write-Host "  2. ssh root@${IP}" -ForegroundColor Cyan
    Write-Host "  3. bash droplet-full-setup.sh" -ForegroundColor Cyan
    exit 1
}

Write-Host "Uploading setup script to root@${IP}..." -ForegroundColor Cyan
& scp $setupScript "root@${IP}:~/droplet-full-setup.sh"

Write-Host "Running setup on Droplet (this may take 5-10 min)..." -ForegroundColor Cyan
& ssh "root@${IP}" "bash droplet-full-setup.sh"

Write-Host "`nDone! Backend should be running at http://${IP}" -ForegroundColor Green
