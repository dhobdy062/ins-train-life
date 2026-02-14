import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAppUrl } from "@/lib/email";
import { normalizeBillingSelection, resolveStripePriceId } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

type CheckoutStartPageProps = {
  searchParams: Promise<{ plan?: string; interval?: string }>;
};

function getCheckoutHint(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown checkout error";

  if (message.startsWith("MISSING_PRICE_ENV:")) {
    const envKey = message.replace("MISSING_PRICE_ENV:", "");
    return `Missing ${envKey} in environment variables.`;
  }

  if (message.includes("Missing STRIPE_SECRET_KEY")) {
    return "Missing STRIPE_SECRET_KEY in environment variables.";
  }

  if (message.includes("Missing APP_URL")) {
    return "Missing APP_URL in environment variables. Set it to your production site URL (https://...).";
  }

  if (message.includes("No such price")) {
    return "Stripe price ID is invalid for the configured Stripe account/key.";
  }

  if (message.includes("Invalid API Key")) {
    return "STRIPE_SECRET_KEY is invalid. Check live/test mode and account.";
  }

  if (message.includes("Restricted API key")) {
    return "Stripe key does not allow creating Checkout sessions.";
  }

  if (message.includes("Invalid API Version")) {
    return "Configured Stripe API version is invalid for this Stripe account.";
  }

  return "Unable to create checkout session with current Stripe configuration.";
}

async function createCheckoutUrl(
  planId: string | undefined,
  interval: string | undefined,
  userId: string,
  orgId: string,
) {
  const selection = normalizeBillingSelection({ planId, interval });
  const { priceId, envKey } = resolveStripePriceId(selection);
  if (!priceId) {
    throw new Error(`MISSING_PRICE_ENV:${envKey}`);
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: orgId,
    success_url: `${getAppUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getAppUrl()}/?canceled=1`,
    allow_promotion_codes: true,
    metadata: {
      orgId,
      userId,
      planId: selection.planId,
      interval: selection.interval,
    },
  });

  return { url: session.url ?? null, selection };
}

export default async function CheckoutStartPage({ searchParams }: CheckoutStartPageProps) {
  const params = await searchParams;
  const { userId, orgId } = await auth();
  const selection = normalizeBillingSelection({ planId: params.plan, interval: params.interval });
  const returnTarget = `/checkout/start?plan=${selection.planId}&interval=${selection.interval}`;
  let checkoutHint =
    "Please retry your plan selection. If this keeps happening, verify Stripe price environment variables are configured for each plan interval.";

  if (!userId) {
    redirect(
      `/sign-in?plan=${selection.planId}&interval=${selection.interval}&redirect_url=${encodeURIComponent(returnTarget)}`,
    );
  }
  if (!orgId) {
    redirect("/demo");
  }

  try {
    const result = await createCheckoutUrl(params.plan, params.interval, userId, orgId);
    if (result.url) {
      redirect(result.url);
    }
  } catch (error) {
    checkoutHint = getCheckoutHint(error);
    const message = error instanceof Error ? error.message : "Unknown checkout error";
    console.error("[checkout/start] Failed to create checkout session", {
      plan: selection.planId,
      interval: selection.interval,
      orgId,
      userId,
      message,
    });
  }

  return (
    <div className="page">
      <div className="shell">
        <main>
          <section className="glass panel">
            <div className="tag">Checkout unavailable</div>
            <h3>We could not start checkout for that plan right now.</h3>
            <p className="disclaimer">{checkoutHint}</p>
            <div className="hero-actions">
              <Link className="button" href="/#pricing">
                Back to pricing
              </Link>
              <Link className="button secondary" href={returnTarget}>
                Retry checkout
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
