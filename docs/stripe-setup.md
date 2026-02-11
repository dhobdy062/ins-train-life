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
