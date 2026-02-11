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

async function createCheckoutUrl(
  planId: string | undefined,
  interval: string | undefined,
  userId: string,
  orgId: string | null | undefined,
) {
  const selection = normalizeBillingSelection({ planId, interval });
  const { priceId } = resolveStripePriceId(selection);
  if (!priceId) {
    return { url: null, selection };
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

  if (!userId) {
    redirect(
      `/sign-in?plan=${selection.planId}&interval=${selection.interval}&redirect_url=${encodeURIComponent(returnTarget)}`,
    );
  }

  try {
    const result = await createCheckoutUrl(params.plan, params.interval, userId, orgId);
    if (result.url) {
      redirect(result.url);
    }
  } catch {
    // Render fallback UI below.
  }

  return (
    <div className="page">
      <div className="shell">
        <main>
          <section className="glass panel">
            <div className="tag">Checkout unavailable</div>
            <h3>We could not start checkout for that plan right now.</h3>
            <p className="disclaimer">
              Please retry your plan selection. If this keeps happening, verify Stripe price environment variables are
              configured for each plan interval.
            </p>
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
