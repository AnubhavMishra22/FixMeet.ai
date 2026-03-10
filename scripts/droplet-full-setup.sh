#!/bin/bash
# FixMeet.ai - Full Droplet Setup (no external services)
# Installs: PostgreSQL, Node 20, PM2, Nginx, clones repo, builds, configures
# Run as root: bash droplet-full-setup.sh

set -e

REPO_URL="${1:-https://github.com/AnubhavMishra22/FixMeet.ai.git}"
DROPLET_IP="${2:-$(curl -s --connect-timeout 2 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address 2>/dev/null || hostname -I | awk '{print $1}')}"
DB_USER="fixmeet"
DB_PASS="$(openssl rand -hex 16)"
DB_NAME="fixmeet"
JWT_SECRET="$(openssl rand -base64 32)"

echo "=== FixMeet.ai Full Droplet Setup ==="

# --- Step 1: Install PostgreSQL ---
echo "[1/8] Installing PostgreSQL..."
apt update
apt install -y postgresql

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo "[2/8] Creating database..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null || true

# Configure PostgreSQL to allow password auth from localhost
PG_HBA=$(sudo -u postgres psql -t -A -c "SHOW hba_file;" 2>/dev/null || echo "/etc/postgresql/16/main/pg_hba.conf")
if [ -f "$PG_HBA" ] && ! grep -q "fixmeet" "$PG_HBA"; then
  echo "host    $DB_NAME    $DB_USER    127.0.0.1/32    scram-sha-256" >> "$PG_HBA"
  echo "host    $DB_NAME    $DB_USER    ::1/128         scram-sha-256" >> "$PG_HBA"
  systemctl restart postgresql
fi

DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"

# --- Step 2: Install nvm + Node 20 ---
echo "[3/8] Installing Node.js 20..."
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
node -v

# --- Step 3: Install PM2 ---
echo "[4/8] Installing PM2..."
npm install -g pm2

# --- Step 4: Install Nginx ---
echo "[5/8] Installing Nginx..."
apt install -y nginx

# --- Step 5: Firewall ---
echo "[6/8] Configuring firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# --- Step 6: Clone and build ---
echo "[7/8] Cloning repo and building..."
cd /root
if [ -d "FixMeet.ai" ]; then
  cd FixMeet.ai && git pull origin main 2>/dev/null || git pull 2>/dev/null || true && cd ..
else
  git clone "$REPO_URL"
fi
cd FixMeet.ai/backend
npm install
npm run build

# --- Step 7: Create .env ---
echo "[8/8] Creating .env..."
cat > .env << ENVEOF
NODE_ENV=production
PORT=3001
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
FRONTEND_URL=https://fixmeet.app
EMAIL_FROM=FixMeet <notifications@fixmeet.ai>
GOOGLE_REDIRECT_URI=https://api.fixmeet.app/api/calendars/google/callback
ENVEOF

# Add placeholders for optional keys (user can edit later)
echo "# Add your keys below:" >> .env
echo "# RESEND_API_KEY=re_xxx" >> .env
echo "# GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com" >> .env
echo "# GOOGLE_CLIENT_SECRET=GOCSPX-xxx" >> .env

# --- Step 8: Configure Nginx ---
cat > /etc/nginx/sites-available/default << 'NGINXEOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name api.fixmeet.app _;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF

nginx -t && systemctl reload nginx

# --- Step 9: Start with PM2 ---
pm2 delete fixmeet-api 2>/dev/null || true
cd /root/FixMeet.ai/backend
pm2 start dist/server.js --name fixmeet-api
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "=========================================="
echo "  FixMeet.ai setup complete!"
echo "=========================================="
echo ""
echo "Backend: http://$DROPLET_IP (port 80)"
echo ""
echo "Next steps:"
echo "  1. Point api.fixmeet.app A record to $DROPLET_IP"
echo "  2. Add RESEND_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET to .env if needed:"
echo "     nano /root/FixMeet.ai/backend/.env"
echo "  3. Restart: pm2 restart fixmeet-api"
echo "  4. SSL: apt install certbot python3-certbot-nginx && certbot --nginx -d api.fixmeet.app"
echo ""
echo "Credentials saved in /root/FixMeet.ai/backend/.env"

# --- Backup cron ---
mkdir -p /root/backups
cat > /root/backup-fixmeet.sh << 'BACKUP'
#!/bin/bash
BACKUP_DIR="/root/backups"
mkdir -p "$BACKUP_DIR"
pg_dump -h 127.0.0.1 -U fixmeet fixmeet > "$BACKUP_DIR/fixmeet_$(date +%F).sql"
find "$BACKUP_DIR" -name "fixmeet_*.sql" -mtime +7 -delete
BACKUP
chmod +x /root/backup-fixmeet.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-fixmeet.sh") | crontab -
