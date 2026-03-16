import { NextResponse } from "next/server";
import { reconcileStripeCustomerBilling } from "@/lib/convex";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

type ReconcileCustomerRequest = {
  stripeCustomerId?: string;
  orgId?: string;
  reassignBillingEvents?: boolean;
};

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length);
}

export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret") ?? getBearerToken(request);

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ReconcileCustomerRequest | null = null;
  try {
    body = (await request.json()) as ReconcileCustomerRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const stripeCustomerId = typeof body?.stripeCustomerId === "string" ? body.stripeCustomerId.trim() : "";
  const orgId = typeof body?.orgId === "string" ? body.orgId.trim() : "";
  const reassignBillingEvents = body?.reassignBillingEvents;

  if (!stripeCustomerId || !orgId) {
    return NextResponse.json(
      { error: "stripeCustomerId and orgId are required" },
      { status: 400 },
    );
  }

  const result = await reconcileStripeCustomerBilling({
    stripeCustomerId,
    orgId,
    reassignBillingEvents: typeof reassignBillingEvents === "boolean" ? reassignBillingEvents : true,
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
