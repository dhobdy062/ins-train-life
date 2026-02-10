import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { enqueueWebhookEvent, recordAlert } from "@/lib/convex";
import { notifyOps } from "@/lib/alerting";
import { buildIdempotencyKey, toHeaderRecord } from "@/lib/webhook";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    await enqueueWebhookEvent({
      provider: "stripe",
      idempotencyKey: buildIdempotencyKey("stripe", event.id, rawBody),
      providerEventId: event.id,
      payload: event,
      headers: toHeaderRecord(request.headers),
      receivedAt: Date.now(),
    });

    return NextResponse.json({ received: true, queued: true, eventId: event.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe webhook error";

    try {
      await recordAlert({
        source: "api/stripe/webhook",
        severity: "critical",
        message,
        context: { hasSignature: true },
      });
    } catch {
      // Ignore secondary failures.
    }

    await notifyOps("Stripe webhook ingestion failed", { message });

    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
