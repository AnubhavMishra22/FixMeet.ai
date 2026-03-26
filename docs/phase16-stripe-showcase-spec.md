# Phase 16 — Stripe & showcase mode (planning spec)

## Scope

- Define how **Pro / Max** relate to **Stripe** while the app stays in **showcase mode**: dashboard routes remain reachable; no hard paywalls on navigation.
- **Later implementation:** Stripe Checkout (test), webhooks, `customer` / `subscription` on `users`, API checks returning **403** for disallowed tiers.
- **Out of scope for v1:** team billing, usage-based AI pricing, invoices/tax/VAT, dunning, proration, mobile IAP, affiliate codes, admin refunds, live keys in committed config.

## Inventory — “Pro” / “Max”

| Location | Notes | Today | Later |
|----------|-------|-------|--------|
| `frontend/src/components/layout/dashboard-layout.tsx` | Sidebar badges: AI Assistant + Meeting Briefs → **Pro**; Follow-ups + Insights → **Max** | UI only | UI hint + optional API enforcement |
| `frontend/src/App.tsx` | Dashboard routes for ai, briefs, followups, insights | `ProtectedRoute` only | Same; optional banners, not route removal in showcase |
| `frontend/src/pages/dashboard/bookings/details.tsx` | Brief / follow-up actions | No tier copy; uses APIs | Enforce in API |
| `frontend/src/pages/dashboard/settings/index.tsx` | MCP API Keys | Not labeled Pro/Max | Assign tier; enforce on `/api/mcp-keys` |
| `backend/src/app.ts` | `/api/briefs`, `/api/followups`, `/api/insights`, `/api/ai` (if env), `/api/mcp-keys` | Auth only | Enforce by plan |

## Showcase rules (non-negotiable)

1. All existing **dashboard routes stay reachable** for authenticated users; no paywall redirect and do not hide sidebar items for “Free” in showcase mode.
2. **Stripe test keys** in dev/shared configs; live keys only in production secrets, never committed.
3. **Pro/Max badges** remain as marketing hints; showcase mode must not remove nav or lock the shell for unpaid users.
4. **Optional:** after test Checkout, show a success banner/toast and refresh entitlements — not the only path to use the app.
5. When enforcement ships, **API is source of truth**; UI is hint only.

## Entitlement matrix

| Feature | Free | Pro | Max | v1 note |
|---------|------|-----|-----|---------|
| Event types, bookings, calendar, public booking | Yes | Yes | Yes | Core — not Stripe-gated v1 |
| AI Assistant | TBD | Yes | Yes | Enforce in API |
| Meeting briefs | No* | Yes | Yes | Enforce in API |
| Follow-ups | No | No | Yes | Enforce in API |
| Insights (+ AI insights, PDF export UX) | No | No | Yes | Enforce in API |
| MCP API keys | No | Yes† | Yes† | Enforce in API |

\* Showcase may use a flag to allow full access. † Suggested mapping.

## User states

- **Gating:** logged-in users only; extend `GET /api/auth/me` (or equivalent) with plan/status.
- **Logged-out:** no billing UI; public routes only (`/:username/:slug`, `/bookings/:id`, auth pages). Public pricing page is optional / later.

## Locked decisions

- **Showcase** = routes + nav unchanged; enforcement = API + optional in-page messaging.
- **Pro** ≈ AI + Briefs + MCP (sidebar + settings).
- **Max** adds Follow-ups + Insights.
