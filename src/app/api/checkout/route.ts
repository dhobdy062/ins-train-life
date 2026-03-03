import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/email";
import { normalizeBillingSelection, resolveStripePriceId } from "@/lib/billing";
import { syncIdentityForRequest } from "@/lib/identitySync";
import { getOrgEntitlement } from "@/lib/convex";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json(
        {
          error: "Organization context is required before checkout.",
          next: "/workspace/select-organization?redirect_url=%2Fcheckout%2Fstart",
        },
        { status: 400 },
      );
    }

    await syncIdentityForRequest({
      userId,
      orgId,
      source: "api/checkout",
      failClosed: false,
    });
    const entitlement = await getOrgEntitlement({ orgId }).catch(() => null);
    if (entitlement?.mode === "paid") {
      return NextResponse.json(
        {
          error: "This organization already has an active paid subscription.",
          code: "ORG_ALREADY_PAID",
          next: "/dashboard/trainer?tab=settings",
        },
        { status: 409 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const selection = normalizeBillingSelection(body);
    const { priceId, envKey } = resolveStripePriceId(selection);
    if (!priceId) {
      return NextResponse.json({ error: `Missing ${envKey}` }, { status: 500 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: orgId,
      success_url: `${getAppUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/?canceled=1`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          orgId,
          planId: selection.planId,
          interval: selection.interval,
        },
      },
      metadata: {
        orgId,
        userId,
        planId: selection.planId,
        interval: selection.interval,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Unable to create checkout session." }, { status: 500 });
  }
}
