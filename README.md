# InsureTrain AI (Vercel Hobby + US East)

Next.js training platform with Clerk-authenticated VAPI web sessions and Convex-backed async webhook processing.

## Architecture Highlights

- **Hosting:** Vercel Hobby, single region (`iad1` / US East)
- **Auth:** Clerk (`/demo` and `/api/vapi/session/start` are protected)
- **Session launch:** `POST /api/vapi/session/start` (auth + org required)
- **Billing webhook:** `POST /api/stripe/webhook` (thin handler, queued to Convex)
- **Voice metrics webhook:** `POST /api/vapi/webhook` (thin handler, queued to Convex)
- **Async processing:** Convex mutations/scheduled tasks for idempotency and rollups

Pricing model reference: `docs/billing-pricing-model.md`

## Environment Variables

Clerk supports keyless mode for local development, so you can run `npm run dev` without creating Clerk keys first.
When you are ready to claim the app or deploy to production, set the following variables.

### Core app
- `APP_URL`
- `VERIFY_HMAC_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `TRAINING_CALL_NUMBER` (optional; shown on verified trial page)

### Clerk (optional in local keyless mode, required for claimed/prod apps)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### Convex
- `CONVEX_URL`
- `CONVEX_ADMIN_KEY`

### Stripe
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_PRICE_STARTER_MONTHLY_ID`
- `STRIPE_PRICE_STARTER_ANNUAL_ID`
- `STRIPE_PRICE_PRO_ANNUAL_ID`
- `STRIPE_PRICE_AGENCY_MONTHLY_ID`
- `STRIPE_PRICE_AGENCY_ANNUAL_ID`
- `STRIPE_WEBHOOK_SECRET`

### VAPI
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY`
- `VAPI_ASSISTANT_ID`
- `VAPI_WEBHOOK_SECRET`

### Optional alerting
- `ALERT_WEBHOOK_URL`
- `CRON_SECRET`
- `WEBHOOK_MAX_LAG_MS`

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Convex Setup

1. Initialize/login Convex locally (interactive):
```bash
npm run convex:dev
```
2. Deploy functions when ready:
```bash
npm run convex:deploy
```

Note: this repository includes minimal `_generated` stubs to keep Next.js builds working before Convex codegen runs. Convex CLI will replace them.

## Webhook Endpoints

- Stripe: `/api/stripe/webhook`
- VAPI: `/api/vapi/webhook`
- Legacy compatibility: `/api/webhook` (deprecated alias to Stripe route)

Both handlers are configured for:
- `runtime = nodejs`
- `preferredRegion = iad1`
- short request path + async Convex queue handoff

### Lag monitoring endpoint

- `GET /api/internal/webhook-lag` (protected by `CRON_SECRET`)
- Vercel Cron in `vercel.json` runs daily at 15:00 UTC (Hobby-compatible)
- If lag exceeds `WEBHOOK_MAX_LAG_MS`, alert events are stored in Convex and optional `ALERT_WEBHOOK_URL` is notified

## Vercel Deployment (Hobby)

1. Import repo in Vercel.
2. Set all env vars for **Development**, **Preview**, and **Production**.
3. Confirm project region behavior uses `iad1` and webhook routes return `2xx` quickly.
4. Configure Stripe and VAPI dashboards to call production webhook URLs.

## Security Requirements

- Never commit API secrets.
- Rotate any exposed VAPI keys before production launch.
- Keep Stripe/VAPI private keys server-only.

## Upgrade Trigger to Vercel Pro

Move from Hobby to Pro when one or more occur:
- sustained webhook latency/error spikes
- function limit pressure
- team collaboration and advanced observability needs
