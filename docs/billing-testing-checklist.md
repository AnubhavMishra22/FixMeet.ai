# Backend billing — manual test checklist (Stripe test mode)

## Prereqs

1. Run migration (server runs `runMigrations` on startup, or `cd backend && npm run db:migrate`).
2. Set in `backend/.env` (see `backend/.env.example`):
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_MAX`
   - `FRONTEND_URL` (e.g. `http://localhost:5173`)
3. `GOOGLE_AI_API_KEY` if testing AI gating.

## Stripe CLI webhooks

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET`.

## Checks

- [ ] **Checkout session** — `POST /api/billing/checkout-session` with Bearer token, body `{ "tier": "pro" }`. Expect `200` and `data.url`. Open URL; pay with test card `4242 4242 4242 4242`.
- [ ] **Webhook** — After payment, Stripe CLI shows `checkout.session.completed`. Server logs should show no handler error.
- [ ] **DB** — User row has `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `subscription_status`, `subscription_current_period_end`, `billing_plan` = `pro` or `max`.
- [ ] **`GET /api/auth/me`** — Response includes `billingPlan`, `subscriptionStatus`, `subscriptionCurrentPeriodEnd`, `billingShowcaseMode`.
- [ ] **AI gate** — With `billing_plan = free` and `BILLING_SHOWCASE_MODE=false`, `POST /api/ai/chat` returns **403** `FORBIDDEN`. After Pro subscription (or with `BILLING_SHOWCASE_MODE=true`), chat succeeds.
- [ ] **Portal** — `POST /api/billing/portal-session` returns `data.url` for a user who has completed Checkout once.
- [ ] **Subscription updated** — Change plan in Stripe Customer Portal; `customer.subscription.updated` updates `billing_plan` / price id.
- [ ] **Subscription deleted** — Cancel sub; `customer.subscription.deleted` clears subscription fields and sets `billing_plan` to `free`.
- [ ] **Idempotency** — Re-deliver the same event from Stripe Dashboard or CLI; no duplicate side effects (row in `stripe_processed_events` unchanged count).

## Prompt 3 (frontend)

Wire Settings (or a Billing page) to call `POST /api/billing/checkout-session` and `POST /api/billing/portal-session`, and surface `billingPlan` / errors from `GET /api/auth/me`.
