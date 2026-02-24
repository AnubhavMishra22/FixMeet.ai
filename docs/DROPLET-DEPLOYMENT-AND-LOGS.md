# Droplet Deployment & Logs

## GitHub Deployment Status (like Railway)

A GitHub Action deploys to the Droplet when you push/merge to `main` (the configured deployment branch). You'll see the deployment status on:
- **PR merge** → Actions tab shows "Deploy to Droplet" run
- **Commit page** → Yellow/orange dot while running, green check when done

### Setup (one-time)

1. Go to **GitHub repo → Settings → Secrets and variables → Actions**
2. Add these secrets:

| Secret | Value |
|-------|-------|
| `DROPLET_HOST` | Your droplet IP (e.g. `137.184.38.130`) |
| `DROPLET_USER` | SSH user (usually `root` — see security note below) |
| `DROPLET_SSH_KEY` | Full contents of your private SSH key |

3. To get your SSH key: if you use a key pair for the droplet, copy the **private** key (the one you use with `ssh -i key.pem`). Paste the entire contents including `-----BEGIN ... -----` and `-----END ... -----`.

4. Ensure GitHub Actions can reach the droplet: your droplet firewall must allow SSH (port 22) from GitHub's IPs, or use a key that's already in `~/.ssh/authorized_keys` on the droplet.

**Security note (root user):** Using `root` for SSH is convenient but not ideal. For production hardening, consider creating a dedicated `deploy` user with limited sudo permissions and deploying to e.g. `/home/deploy/FixMeet.ai`. The current setup uses `root` for simplicity with our single-droplet MVP; `droplet-full-setup.sh` installs to `/root/FixMeet.ai`.

---

## Where to See Logs (like Railway deployment logs)

**Droplets vs App Platform:** DigitalOcean **Droplets** do not have a built-in log viewer in the GUI (unlike Railway). The **App Platform** product does have build/deploy/crash logs in the dashboard, but we use a Droplet for cost control.

**Options for GUI-like logs:**
- **SSH + PM2** (below) — free, no setup
- **Papertrail** or **Better Stack (Logtail)** — free tier, ship PM2 logs to a web dashboard
- **PM2 Plus** (Keymetrics) — PM2's own monitoring with log viewer

On a Droplet with PM2, logs are **on the server**. SSH in and run:

```bash
ssh root@YOUR_DROPLET_IP
```

Then:

| Command | What it shows |
|---------|---------------|
| `pm2 logs fixmeet-api` | Live logs (stdout + stderr), Ctrl+C to exit |
| `pm2 logs fixmeet-api --lines 200` | Last 200 lines |
| `pm2 logs fixmeet-api --err` | Errors only |
| `pm2 status` | App status (online/stopped), memory, uptime |

**Log file locations** (if you need to inspect files directly):
- `~/.pm2/logs/fixmeet-api-out.log` — stdout
- `~/.pm2/logs/fixmeet-api-error.log` — stderr

**If deployment fails:** Check the GitHub Actions run (Actions tab → failed workflow → expand steps). The SSH step output shows build/restart errors. You can also SSH in and run `pm2 logs fixmeet-api --err --lines 50` to see recent errors.
