#!/bin/bash
# Deploy FixMeet backend to Droplet (run on droplet via SSH from GitHub Actions)
# Usage: run from repo root, e.g. /root/FixMeet.ai

set -e
cd /root/FixMeet.ai

echo "=== Deploying FixMeet backend ==="
git fetch origin main
git reset --hard origin/main

cd backend
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export NODE_OPTIONS="--max-old-space-size=1536"

npm ci
npm run build
pm2 restart fixmeet-api --update-env

echo "Deploy complete. Waiting for health check..."
sleep 5
curl -sf https://api.fixmeet.app/health || curl -sf http://localhost:3001/health
echo ""
echo "=== Deploy successful ==="
