# Migration Plan: Railway → DigitalOcean

**Purpose:** Move FixMeet backend from Railway (free tier ending) to DigitalOcean.  
**Estimated time:** 2–4 hours  
**Downtime:** ~15–30 minutes (during cutover)

---

## Current Architecture (Railway)

| Component | Current | Notes |
|-----------|---------|-------|
| **Backend API** | Railway | Node.js 20, Express, TypeScript |
| **Database** | Railway PostgreSQL (or external) | postgres.js driver |
| **Frontend** | Vercel | fixmeet.app |
| **API domain** | api.fixmeet.app | Points to Railway |
| **Email** | Resend | External, no change |
| **Google OAuth** | Google Cloud | Redirect URI: api.fixmeet.app |

---

## Target Architecture (DigitalOcean)

| Component | DigitalOcean Service | Cost (approx) |
|-----------|----------------------|----------------|
| **Backend API** | App Platform (Node.js) | $5–12/mo |
| **Database** | Managed PostgreSQL | $15/mo (1GB) or $7/mo (basic) |
| **Frontend** | Vercel (unchanged) | — |
| **API domain** | api.fixmeet.app | DNS update only |

**Alternative:** Use a $6/mo Droplet + Docker for backend + self-hosted Postgres (cheaper but more ops work).

---

## Phase 1: Preparation (Before Migration)

### 1.1 Create DigitalOcean Account & Resources

1. **Sign up** at [digitalocean.com](https://www.digitalocean.com)
2. **Create Managed Database (PostgreSQL)**
   - Control Panel → Databases → Create Database Cluster
   - Engine: PostgreSQL 15+
   - Plan: Basic ($15/mo) or Dev ($7/mo for testing)
   - Region: Same as App Platform (e.g. NYC, SFO)
   - Save: `host`, `port`, `database`, `user`, `password`, `ssl_mode`

3. **Create App Platform App**
   - Control Panel → Apps → Create App
   - Source: Connect GitHub repo `AnubhavMishra22/FixMeet.ai`
   - Root directory: `backend` (or set build context)
   - Branch: `main` (or your production branch)

### 1.2 Export Data from Railway (Backup)

```bash
# Option A: Railway CLI (if you have it)
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Option B: From any machine with DATABASE_URL
pg_dump "postgresql://user:pass@host:port/db?sslmode=require" > backup.sql
```

**Important:** Store backup securely. Test restore locally before migration.

### 1.3 Document Current Environment Variables

Export from Railway dashboard or CLI and save to a secure file. You will need:

- `DATABASE_URL` (new one from DO)
- `JWT_SECRET`
- `FRONTEND_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (update after migration)
- `GOOGLE_AI_API_KEY` (optional)
- `MCP_ENABLED`, `MCP_RATE_LIMIT` (optional)

---

## Phase 2: Add Deployment Artifacts

### 2.1 Create Dockerfile (Recommended for App Platform)

Create `backend/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

### 2.2 Create `.dockerignore`

Create `backend/.dockerignore`:

```
node_modules
dist
.env
.env.*
*.log
.git
```

### 2.3 App Platform Spec (Alternative to Dockerfile)

If using App Platform’s native Node.js build instead of Docker:

- **Build command:** `npm ci && npm run build`
- **Run command:** `npm start`
- **HTTP port:** 3001

---

## Phase 3: Configure DigitalOcean App Platform

### 3.1 App Settings

| Setting | Value |
|---------|-------|
| **Name** | fixmeet-backend |
| **Source** | GitHub, `FixMeet.ai`, `backend` directory |
| **Branch** | main |
| **Build Command** | `npm ci && npm run build` |
| **Run Command** | `npm start` |
| **HTTP Port** | 3001 |

### 3.2 Environment Variables

Add all variables from your Railway env. Use **Encrypted** for secrets.

| Variable | Example | Encrypted |
|----------|---------|-----------|
| NODE_ENV | production | No |
| PORT | 3001 | No |
| DATABASE_URL | postgresql://... (from DO DB) | Yes |
| JWT_SECRET | ... | Yes |
| FRONTEND_URL | https://fixmeet.app | No |
| RESEND_API_KEY | re_... | Yes |
| EMAIL_FROM | FixMeet <noreply@fixmeet.app> | No |
| GOOGLE_CLIENT_ID | ... | Yes |
| GOOGLE_CLIENT_SECRET | ... | Yes |
| GOOGLE_REDIRECT_URI | https://api.fixmeet.app/... | No |
| GOOGLE_AI_API_KEY | (optional) | Yes |

### 3.3 Custom Domain

- In App Platform: Settings → Domains → Add Domain
- Add `api.fixmeet.app`
- DO will show CNAME target (e.g. `xxx.ondigitalocean.app`)

---

## Phase 4: Database Migration

### 4.1 Run Migrations on New Database

```bash
# Set DATABASE_URL to new DO PostgreSQL
export DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"

cd backend
npm run db:migrate
```

### 4.2 Restore Data (if migrating existing data)

```bash
psql "$DATABASE_URL" < backup.sql
```

Or use `pg_restore` for custom format dumps.

### 4.3 Verify

- Connect with `psql` or a GUI
- Confirm tables: `users`, `event_types`, `bookings`, etc.

---

## Phase 5: DNS Cutover

### 5.1 Update DNS for api.fixmeet.app

Where your domain is managed (Cloudflare, Namecheap, etc.):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | api | `your-app.ondigitalocean.app` | 300 |

Or use the exact target DigitalOcean provides.

### 5.2 Update Google OAuth Redirect URI

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Edit OAuth 2.0 Client
3. **Authorized redirect URIs:** Keep `https://api.fixmeet.app/api/calendars/google/callback` (no change if domain stays same)
4. If you use a temp DO domain first, add it, then remove after cutover

---

## Phase 6: Deploy & Test

### 6.1 Deploy on App Platform

- Push a commit or trigger a manual deploy
- Wait for build and deploy
- Check build logs for errors

### 6.2 Smoke Tests

- [ ] `GET https://api.fixmeet.app/` (or health endpoint)
- [ ] Login at fixmeet.app
- [ ] Create event type
- [ ] Public booking flow
- [ ] Google Calendar connect
- [ ] Email delivery (Resend)

### 6.3 Update Frontend (if API URL changes)

If you temporarily use a different API URL:

- Vercel: set `VITE_API_URL` in Environment Variables
- Redeploy frontend

---

## Phase 7: Railway Shutdown

1. Confirm all traffic works on DigitalOcean
2. In Railway: pause or delete the project
3. Cancel Railway subscription if applicable
4. Keep Railway backup for 30 days

---

## Rollback Plan

If something goes wrong:

1. **DNS:** Point `api` CNAME back to Railway (or previous host)
2. **Frontend:** Revert `VITE_API_URL` if changed
3. **Database:** Restore from backup if needed
4. **Google OAuth:** Re-add Railway URL if you had changed it

---

## Appendix: Droplet Path (Steps 2–7)

If using a **Droplet** instead of App Platform (e.g. $6/mo with GitHub Student credits):

**Droplet IP:** Replace `YOUR_DROPLET_IP` below with your Droplet's IP address.

**Full self-contained setup (PostgreSQL + backend + Nginx, no external DB):**
```powershell
# From your machine. Use SSH keys (recommended): ssh-copy-id root@YOUR_DROPLET_IP
cd FixMeet.ai
.\scripts\run-droplet-setup.ps1 -IP "YOUR_DROPLET_IP"
```

**Or run manually after SSH:**
```powershell
scp scripts/droplet-full-setup.sh root@YOUR_DROPLET_IP:~/
ssh root@YOUR_DROPLET_IP
bash droplet-full-setup.sh
```

### Step 2: SSH into Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### Step 3: Install nvm + Node 20

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
node -v   # should show v20.x
```

### Step 4: Install PM2

```bash
npm install -g pm2
```

### Step 5: Install Nginx

```bash
apt update && apt install -y nginx
```

### Step 6: Open Firewall

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
```

### Step 7: Clone Repo, Build, Configure

```bash
# Clone (replace with your repo URL if private)
git clone https://github.com/AnubhavMishra22/FixMeet.ai.git
cd FixMeet.ai/backend

# Install and build
npm install
npm run build

# Create .env (edit with your values)
nano .env
```

**Required `.env` variables:**

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
JWT_SECRET=<your-secret>
FRONTEND_URL=https://fixmeet.app
RESEND_API_KEY=re_...
EMAIL_FROM=FixMeet <noreply@fixmeet.app>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://api.fixmeet.app/api/calendars/google/callback
```

### Step 8: Start Backend with PM2

```bash
cd /root/FixMeet.ai/backend
pm2 start dist/server.js --name fixmeet-api
pm2 save
pm2 startup   # follow the command it prints to enable on reboot
```

### Step 9: Configure Nginx (Reverse Proxy)

```bash
nano /etc/nginx/sites-available/default
```

Replace the `server` block with:

```nginx
server {
    listen 80;
    server_name api.fixmeet.app;
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
```

Then:

```bash
nginx -t && systemctl reload nginx
```

### Step 10: DNS + SSL (Optional but Recommended)

1. Point `api.fixmeet.app` A record to your Droplet IP
2. Install Certbot: `apt install -y certbot python3-certbot-nginx`
3. Run: `certbot --nginx -d api.fixmeet.app`

---

## Cost Comparison

| Service | Railway (current) | DigitalOcean |
|---------|-------------------|--------------|
| Backend | Free (ending) | App Platform ~$5–12/mo |
| Database | Included / Free | Managed DB ~$7–15/mo |
| **Total** | ~$0 | **~$12–27/mo** |

**Cheaper option:** $6 Droplet + Docker + self-hosted Postgres (~$21/mo with 1GB DB) — more setup, less managed.

---

## Checklist Summary

- [ ] Create DO account
- [ ] Create Managed PostgreSQL
- [ ] Create App Platform app, connect GitHub
- [ ] Add Dockerfile or build/run commands
- [ ] Set all env vars
- [ ] Backup Railway database
- [ ] Run migrations on new DB
- [ ] Restore data (if migrating)
- [ ] Deploy app, verify build
- [ ] Add custom domain api.fixmeet.app
- [ ] Update DNS CNAME
- [ ] Test full flow
- [ ] Shut down Railway

---

## References

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Managed Databases](https://docs.digitalocean.com/products/databases/)
- [Custom Domains on App Platform](https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/)
