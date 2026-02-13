# Stripe CLI & Resource Setup Guide

This project uses Stripe for subscription billing. Follow these steps to set up your local development environment.

## 1. Create Stripe Resources

We provide a script to automatically create the necessary Products and Prices in your Stripe account.

1.  Open your [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys).
2.  Copy your **Secret key** (starts with `sk_test_`).
3.  Paste it into `.env.local` as `STRIPE_SECRET_KEY`.
4.  Run the setup script:
    ```bash
    npx tsx scripts/setup-stripe.ts
    ```
5.  The script will output several `STRIPE_PRICE_...` lines. Copy and paste these into your `.env.local`.

## 2. Local Webhook Testing

To handle subscription updates locally, you need the Stripe CLI to forward events to your local server.

### Installation
Follow the instructions in the [official documentation](https://docs.stripe.com/stripe-cli/install.md) for your OS.

### Forwarding Webhooks
1.  Log in to the CLI:
    ```bash
    stripe login
    ```
2.  Start listening for events:
    ```bash
    stripe listen --forward-to localhost:3000/api/stripe/webhook
    ```
3.  The CLI will provide a **webhook signing secret** (starts with `whsec_`).
4.  Copy this secret into your `.env.local` as `STRIPE_WEBHOOK_SECRET`.

## 3. Common CLI Commands

- **Trigger a specific event:**
  ```bash
  stripe trigger checkout.session.completed
  ```
- **View real-time logs:**
  ```bash
  stripe logs tail
  ```
- **Create a test customer:**
  ```bash
  stripe customers create --email="test@example.com" --name="Test User"
  ```

## 4. Production Webhook Setup (Vercel)

Complete these steps in Stripe **Live mode** for production billing unlocks.

1. Open Stripe Dashboard -> Developers -> Webhooks -> **Add endpoint**.
2. Endpoint URL:
   ```text
   https://<your-production-domain>/api/stripe/webhook
   ```
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Save endpoint and copy the signing secret (`whsec_...`).
5. In Vercel -> Project -> Settings -> Environment Variables (Production), set:
   - `STRIPE_WEBHOOK_SECRET=<whsec_...>`
   - `STRIPE_SECRET_KEY=<sk_live_...>`
   - all required `STRIPE_PRICE_*` vars
   - `APP_URL=https://<your-production-domain>`
6. Redeploy production after env updates.

## 5. Production Validation Checklist

1. Complete one checkout in the same Stripe mode as your `STRIPE_SECRET_KEY`.
2. In Stripe -> Webhooks, confirm your endpoint received `checkout.session.completed` with `2xx`.
3. In Vercel logs, confirm `/api/stripe/webhook` responded with:
   ```json
   { "received": true, "queued": true }
   ```
4. In Convex data, verify a `billingEvents` entry exists for your org.
5. Retry training start for that org. It should no longer return subscription-required.
