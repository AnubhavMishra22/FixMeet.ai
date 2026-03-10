# Migration: Railway → DigitalOcean Droplet

## Summary
Migrates FixMeet backend from Railway (free tier ending) to a self-hosted DigitalOcean Droplet. Includes full deployment automation, database migration tooling, and production hardening.

---

## Features Implemented

### 1. DigitalOcean Droplet Deployment
- **`scripts/droplet-full-setup.sh`** — One-command full setup script:
  - Installs PostgreSQL, Node.js 20 (via nvm), PM2, Nginx
  - Creates local database and user with secure credentials
  - Configures firewall (22, 80, 443)
  - Adds 1GB swap to prevent OOM during `npm run build` on 1GB droplets
  - Clones repo, builds backend with `NODE_OPTIONS=--max-old-space-size=1536`
  - Creates `.env` with placeholders for optional keys
  - Configures Nginx reverse proxy for api.fixmeet.app
  - Starts app with PM2 and enables startup on boot
- **`scripts/droplet-setup.sh`** — Lightweight setup variant
- **`scripts/run-droplet-setup.ps1`** — PowerShell wrapper for Windows users

### 2. PM2 Production Config
- **`backend/ecosystem.config.cjs`** — PM2 ecosystem file:
  - Uses `node_args: '-r dotenv/config'` so `.env` is loaded before app start (fixes AI routes not mounting)
  - Droplet-specific `cwd` and production env defaults
  - No secrets in config — all from `.env`

### 3. Database Migration (Railway → Droplet)
- **`docs/MIGRATION-RAILWAY-TO-DIGITALOCEAN.md`** — Full migration guide:
  - Phase-by-phase plan (prep, export, cutover, DNS, SSL)
  - Cost comparison and architecture notes
  - Environment variable checklist
- **`scripts/migrate-railway-to-droplet.sh`** / **`.ps1`** — Scripts to `pg_dump` from Railway and restore to droplet PostgreSQL

### 4. Daily Backups
- Cron job (2 AM daily) runs `pg_dump` to `/root/backups/`
- Retains 7 days of backups
- Uses `.pgpass` for password-less dump (no secrets in cron)

### 5. API & Production Fixes
- **Root route** (`GET /`) — Returns API name, status, version for health checks
- **`.gitattributes`** — Enforces LF line endings (fixes CRLF issues on Windows → Linux)
- **`attempt_count` migration** — Adds missing column to `meeting_briefs` when present

### 6. AI Routes & Env Schema
- **`backend/src/config/env.ts`** — Added optional AI env vars to schema:
  - `GOOGLE_AI_API_KEY`, `GOOGLE_AI_MODEL_NAME`, `GOOGLE_AI_MAX_TOKENS`
  - Ensures AI chat routes mount when key is set in `.env`

### 7. Security & Review Fixes
- Removed hardcoded secrets from scripts; use SSH keys and placeholders
- Addressed Copilot review: backup pgpass, cron dedup, git subshell, cost doc
- Addressed Gemini review: version from package.json, .gitattributes LF, swap + NODE_OPTIONS for droplet build

### 8. Merge Conflict Resolution (main)
- Resolved conflicts in `backend/src/config/env.ts` (AI + MCP env vars)
- Resolved conflicts in `backend/src/app.ts` (root route + CORS comment)

---

## Testing
- [ ] Run `droplet-full-setup.sh` on a fresh 1GB droplet
- [ ] Point api.fixmeet.app A record to droplet IP
- [ ] Add SSL via Certbot
- [ ] Verify AI chat works (POST /api/ai/chat) with GOOGLE_AI_API_KEY in .env
- [ ] Run Railway → Droplet DB migration if migrating existing data
