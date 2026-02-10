import { NextResponse } from "next/server";
import { enqueueWebhookEvent, recordAlert } from "@/lib/convex";
import { notifyOps } from "@/lib/alerting";
import {
  buildIdempotencyKey,
  extractVapiSignature,
  parseJsonSafe,
  toHeaderRecord,
  verifyVapiSignature,
} from "@/lib/webhook";

type VapiWebhookPayload = {
  id?: string;
  type?: string;
  event?: string;
  call?: { id?: string };
  message?: { id?: string };
};

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

export async function POST(request: Request) {
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing VAPI_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = extractVapiSignature(request.headers);
  if (!signature) {
    return NextResponse.json({ error: "Missing VAPI webhook signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifyVapiSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = parseJsonSafe<VapiWebhookPayload>(rawBody);
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const providerEventId = payload.id || payload.message?.id || payload.call?.id;

  try {
    await enqueueWebhookEvent({
      provider: "vapi",
      idempotencyKey: buildIdempotencyKey("vapi", providerEventId, rawBody),
      providerEventId,
      payload,
      headers: toHeaderRecord(request.headers),
      receivedAt: Date.now(),
    });

    return NextResponse.json({ received: true, queued: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "VAPI webhook ingestion error";

    try {
      await recordAlert({
        source: "api/vapi/webhook",
        severity: "critical",
        message,
      });
    } catch {
      // Ignore secondary failures.
    }

    await notifyOps("VAPI webhook ingestion failed", { message, providerEventId });

    return NextResponse.json({ error: "Unable to queue event" }, { status: 500 });
  }
}
