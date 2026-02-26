import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/email";
import { getStripeCustomerForOrg } from "@/lib/convex";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

export async function POST() {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json({ error: "Organization context is required." }, { status: 400 });
    }

    const customer = await getStripeCustomerForOrg({ orgId });
    if (!customer.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found for this organization. Start with an initial checkout." },
        { status: 404 },
      );
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: `${getAppUrl()}/dashboard/trainer?tab=settings`,
    });

    return NextResponse.json({ url: portal.url });
  } catch {
    return NextResponse.json({ error: "Unable to create billing portal session." }, { status: 500 });
  }
}
