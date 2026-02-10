import { NextResponse } from "next/server";
import { checkLaggingWebhooks } from "@/lib/convex";
import { notifyOps } from "@/lib/alerting";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const providedSecret = headerSecret ?? bearerSecret;

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const maxLagMs = Number(process.env.WEBHOOK_MAX_LAG_MS || 1000 * 60 * 5);

  const result = await checkLaggingWebhooks({
    maxLagMs,
    limit: 300,
  });

  if (result.laggingCount > 0) {
    await notifyOps("Webhook lag detected", {
      laggingCount: result.laggingCount,
      checked: result.checked,
      maxLagMs,
    });
  }

  return NextResponse.json({ ok: true, ...result, maxLagMs });
}
