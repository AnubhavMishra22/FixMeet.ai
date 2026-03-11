#!/bin/bash
# Deploy FixMeet backend to Droplet (run on droplet via SSH from GitHub Actions)
# Usage: ./deploy-to-droplet.sh [branch]
#   branch: defaults to main if not specified

set -e
BRANCH="${1:-main}"
cd /root/FixMeet.ai

echo "=== Deploying FixMeet backend (branch: $BRANCH) ==="
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

cd backend
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export NODE_OPTIONS="--max-old-space-size=1536"

npm ci
npm run build
pm2 restart fixmeet-api --update-env

echo "Deploy complete. Waiting for health check..."
ATTEMPTS=6
DELAY=5
for i in $(seq 1 $ATTEMPTS); do
  if curl -sf https://api.fixmeet.app/health >/dev/null || curl -sf http://localhost:3001/health >/dev/null; then
    echo ""
    echo "=== Deploy successful ==="
    exit 0
  fi
  if [ "$i" -lt "$ATTEMPTS" ]; then
    echo "Health check failed (attempt $i/$ATTEMPTS). Retrying in $DELAY seconds..."
    sleep $DELAY
  fi
done
echo "Health check failed after $((ATTEMPTS * DELAY)) seconds." >&2
exit 1
