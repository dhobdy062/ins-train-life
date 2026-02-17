# Convex Tracking Matrix

Date: 2026-02-17

This matrix documents what enters Convex, where it is persisted, and which function is responsible.

## Sources

| Source | Entry Point | Primary Convex Function(s) | Tables Updated |
|---|---|---|---|
| Stripe webhooks | `/api/stripe/webhook` | `webhooks.enqueueWebhookEvent` -> `webhooks.processWebhookEvent` -> `persistStripeEvent` | `webhookEvents`, `billingEvents`, `stripeCustomerOrgMap`, `usageRollups`, `alertEvents` |
| VAPI webhooks | `/api/vapi/webhook` | `webhooks.enqueueWebhookEvent` -> `webhooks.processWebhookEvent` -> `persistVapiEvent` | `webhookEvents`, `sessionMetrics`, `usageRollups`, `trainingSessions`, `alertEvents` |
| Clerk webhooks | `/api/clerk/webhook` | `identity.upsert*`, `identity.mark*` | `users`, `organizations`, `organizationMemberships`, `alertEvents` |
| Session start (trainer) | `/api/vapi/session/start` | `sessions.createTrainingSession` | `trainingSessions`, `alertEvents` (on failures) |
| Trial start (trainee) | `/api/vapi/trial/start` | `sessions.reserveTrialSession` | `trialSessions` |
| Session artifacts (manual API) | `/api/training/session/[sessionKey]/files/*` | `storage.storeSessionRecording`, `storage.storeTranscript`, `storage.getSessionWithFiles` | `trainingSessions` + Convex blob storage |
| Sequence email send | `/api/email/sequence` | `webhooks.logEmailEvent` | `emailEvents` |
| Lead verification email send | `/api/lead` | `webhooks.logEmailEvent` | `emailEvents` |
| Lag monitoring cron | `/api/internal/webhook-lag` | `webhooks.checkLaggingWebhooks` | `alertEvents` |

## Correlation Rules

1. VAPI session correlation uses `metadata.sessionKey`, then `metadata.session_key`, then `payload.sessionKey`, then call/event fallbacks.
2. Stripe org correlation uses webhook metadata first, then `stripeCustomerOrgMap` fallback.
3. Billing access from `checkout.session.completed` is provisional for 15 minutes until subscription status events arrive.

## Data Guarantees

1. Webhook ingestion is idempotent on `(provider, idempotencyKey)`.
2. Failed webhook processing writes an `alertEvents` record with context.
3. Email API responses are logged as `sent` or `failed` in `emailEvents`.
4. End-of-call VAPI events attempt to mark `trainingSessions` completed and persist recording/transcript artifacts when present.

## Known Operational Notes

1. Events with unresolved org context may still be stored as `orgId = "unscoped"` in `billingEvents`.
2. VAPI artifact persistence logs warning alerts when media is unavailable in payload.
