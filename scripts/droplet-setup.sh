#!/bin/bash
# FixMeet.ai - DigitalOcean Droplet Setup (Steps 3–7)
# Run as root after: ssh root@137.184.38.130
# Usage: bash droplet-setup.sh [REPO_URL]
# Example: bash droplet-setup.sh https://github.com/AnubhavMishra22/FixMeet.ai.git

set -e

REPO_URL="${1:-https://github.com/AnubhavMishra22/FixMeet.ai.git}"

echo "=== Step 3: Install nvm + Node 20 ==="
if ! command -v nvm &>/dev/null; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
node -v

echo "=== Step 4: Install PM2 ==="
npm install -g pm2

echo "=== Step 5: Install Nginx ==="
apt update && apt install -y nginx

echo "=== Step 6: Open Firewall ==="
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo "=== Step 7: Clone Repo, Build ==="
cd /root
if [ -d "FixMeet.ai" ]; then
  echo "FixMeet.ai exists, pulling latest..."
  cd FixMeet.ai && git pull && cd ..
else
  git clone "$REPO_URL"
fi
cd FixMeet.ai/backend
npm install
npm run build

echo ""
echo "=== Setup complete (steps 3–7) ==="
echo ""
echo "Next steps:"
echo "  1. Create .env:  nano /root/FixMeet.ai/backend/.env"
echo "  2. Start app:    pm2 start /root/FixMeet.ai/backend/dist/server.js --name fixmeet-api"
echo "  3. Save PM2:     pm2 save && pm2 startup"
echo "  4. Configure Nginx (see docs/MIGRATION-RAILWAY-TO-DIGITALOCEAN.md)"
