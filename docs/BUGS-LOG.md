# Bugs Log

Documentation of bugs found, how they were discovered, and how they were fixed.

## Keeping this file in sync across branches

Git does not have a shared-file mechanism. This file is versioned like any other. To keep it updated across branches:

- **When you fix a bug in a branch:** Add the entry in that branch. When you merge to `main`, the log comes with it.
- **To get updates in your branch:** Merge `main` into your branch periodically (`git merge main`).
- **When merging branches:** Resolve any conflicts in this file by keeping all entries from both sides.

---

## 1. AI Chat 404 — POST /api/ai/chat not found

**Branch:** `Migration/Backend`  
**File(s):** `backend/ecosystem.config.cjs`, `backend/src/config/env.ts`

**What it was:** The AI chat endpoint returned 404 "Route not found". The AI routes are only mounted when `GOOGLE_AI_API_KEY` is set, but PM2 was not loading `.env`, so the key was never available at startup.

**How we found it:** User reported `Route not found: POST /api/ai/chat` when using the AI chat. Server logs showed "AI routes skipped (no GOOGLE_AI_API_KEY)" even though the key was in `.env`.

**How we solved it:**
- PM2 does not support `env_file`. Replaced it with `node_args: '-r dotenv/config'` in `backend/ecosystem.config.cjs` so `.env` is loaded before the app starts.
- Added `GOOGLE_AI_API_KEY`, `GOOGLE_AI_MODEL_NAME`, `GOOGLE_AI_MAX_TOKENS` to the Zod schema in `backend/src/config/env.ts` so they are available when the app checks for the key.

---

## 2. Merge conflicts in Migration/Backend (env.ts, app.ts)

**Branch:** `Migration/Backend`  
**File(s):** `backend/src/config/env.ts`, `backend/src/app.ts`

**What it was:** Two merge conflicts when merging `main` into `Migration/Backend`: `backend/src/config/env.ts` (AI vs MCP env vars) and `backend/src/app.ts` (root route vs CORS comment).

**How we found it:** `git merge origin/main` reported conflicts in both files.

**How we solved it:**
- **env.ts:** Kept both — AI env vars (`GOOGLE_AI_API_KEY`, etc.) and MCP env vars (`MCP_ENABLED`, `MCP_RATE_LIMIT`) from main.
- **app.ts:** Kept the root route for API info and the CORS TODO comment from main.

---

## 3. GitHub deploy — "Error: missing server host"

**Branch:** `main` (after merging PR #58)  
**File(s):** `.github/workflows/deploy-droplet.yml` (workflow expects secrets)

**What it was:** The Deploy to Droplet workflow failed with "Error: missing server host" because the required GitHub Actions secrets were not set.

**How we found it:** After merging the deploy PR, the workflow run failed. The `appleboy/ssh-action` step logged "missing server host" because `DROPLET_HOST` was empty.

**How we solved it:** Added the three secrets in **Settings → Secrets and variables → Actions**:
- `DROPLET_HOST` — droplet IP (e.g. `137.184.38.130`)
- `DROPLET_USER` — SSH user (usually `root`)
- `DROPLET_SSH_KEY` — full private SSH key content (including `-----BEGIN` and `-----END` lines)

---

## 4. Insights tab — "Failed to load insights data"

**Branch:** `AI/Insights-Dashboard`  
**File(s):** `frontend/src/lib/api.ts`, `frontend/src/pages/dashboard/insights/index.tsx`

**What it was:** The Insights dashboard showed "Failed to load insights data" and did not load stats, charts, or AI insights.

**How we found it:** User reported the error when opening the Insights tab. The toast appeared when the `Promise.all` of insights API calls threw.

**How we solved it:**
- Added `unwrap()` in `frontend/src/lib/api.ts` to safely extract `data` from `{ success: true, data: ... }` and throw a clear error when `data` is missing.
- Added null checks before `setStats({ ...s, comparison: c })` so we do not spread `null`/`undefined`.
- Improved error handling: the toast now shows the backend error message (`err.response?.data?.error?.message`) for easier debugging.
- Fix is in `AI/Insights-Dashboard` branch; merge to `main` to deploy.

---

## Adding new entries

For each new bug, add a section with:

1. **Branch** — Where the bug was found/fixed.
2. **File(s)** — Paths to affected files.
3. **What it was** — Brief description of the bug.
4. **How we found it** — How the bug was observed or reproduced.
5. **How we solved it** — Exact changes made (files, code, config, etc.).
