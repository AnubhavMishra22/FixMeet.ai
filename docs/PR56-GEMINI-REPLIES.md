# PR 56 – Suggested replies for Gemini comments

Use these when replying to and resolving each Gemini comment on the PR.

---

## 1. ecosystem.config.cjs – JWT_SECRET & DATABASE_URL hardcoded (security-critical)

**Comment:** Hardcoding secrets in PM2 config.

**Reply:**
> Fixed. Removed `DATABASE_URL` and `JWT_SECRET` from the ecosystem config. Secrets are now loaded from `.env` at runtime via dotenv. The config only keeps non-sensitive values (NODE_ENV, PORT, FRONTEND_URL, etc.). Added a comment in the file documenting this.

**Action:** Resolve

---

## 2. run-droplet-setup.ps1 – Hardcoded SSH host key (critical)

**Comment:** Hardcoding host key defeats MITM protection.

**Reply:**
> Fixed. Replaced plink/pscp with native `ssh` and `scp`. Host key verification is now handled by SSH on first connection. Removed the hardcoded host key and `-hostkey` parameter.

**Action:** Resolve

---

## 3. droplet-full-setup.sh – Hardcoded DROPLET_IP (high)

**Comment:** IP should be a parameter or fetched from metadata.

**Reply:**
> Fixed. `DROPLET_IP` is now the second script parameter (`$2`). If omitted, it is auto-detected from DigitalOcean metadata (`169.254.169.254`) or `hostname -I` as fallback.

**Action:** Resolve

---

## 4. run-droplet-setup.ps1 – IP default value (high)

**Comment:** IP parameter should not have a default.

**Reply:**
> Fixed. `-IP` is now a required parameter with no default. Usage: `.\run-droplet-setup.ps1 -IP "YOUR_DROPLET_IP"`.

**Action:** Resolve

---

## 5. run-droplet-setup.ps1 – Password on command line (high)

**Comment:** Using `-pw` is insecure; use SSH keys.

**Reply:**
> Fixed. Script now uses native `ssh` and `scp` with SSH key authentication. Removed plink/pscp and password-based auth. Users must run `ssh-copy-id root@YOUR_DROPLET_IP` first.

**Action:** Resolve

---

## 6. ecosystem.config.cjs – DATABASE_URL hardcoded (medium)

**Comment:** Hardcoded connection string.

**Reply:**
> Addressed in the same change as comment #1. `DATABASE_URL` removed; loaded from `.env` at runtime.

**Action:** Resolve

---

## 7. MIGRATION-RAILWAY-TO-DIGITALOCEAN.md – Hardcoded IP in docs (medium)

**Comment:** Use placeholder instead of real IP.

**Reply:**
> Fixed. Replaced the hardcoded IP with `YOUR_DROPLET_IP` placeholder throughout the doc. Also updated `run-droplet-setup.ps1` usage to require `-IP` and use SSH keys.

**Action:** Resolve

---

## 8. droplet-full-setup.sh – DB password predictability (medium)

**Comment:** Static prefix and short length.

**Reply:**
> Fixed. Now uses `openssl rand -hex 16` (32 hex chars) with no predictable prefix.

**Action:** Resolve
