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
for i in 1 2 3 4 5 6; do
  if curl -sf https://api.fixmeet.app/health >/dev/null || curl -sf http://localhost:3001/health >/dev/null; then
    echo ""
    echo "=== Deploy successful ==="
    exit 0
  fi
  if [ "$i" -lt 6 ]; then
    echo "Health check failed (attempt $i/6). Retrying in 5 seconds..."
    sleep 5
  fi
done
echo "Health check failed after 30 seconds." >&2
exit 1
