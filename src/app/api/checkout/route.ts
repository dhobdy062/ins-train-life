import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/email";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

export async function POST() {
  try {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const clerkEnabled = Boolean(publishableKey && /^pk_(test|live)_/.test(publishableKey) && process.env.CLERK_SECRET_KEY);
    if (!clerkEnabled) {
      return NextResponse.json({ error: "Clerk is not configured." }, { status: 500 });
    }

    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "Missing STRIPE_PRICE_ID" }, { status: 500 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: orgId ?? userId,
      success_url: `${getAppUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/?canceled=1`,
      allow_promotion_codes: true,
      metadata: {
        orgId: orgId ?? "unscoped",
        userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Unable to create checkout session." }, { status: 500 });
  }
}
