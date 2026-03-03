import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAppUrl } from "@/lib/email";
import { normalizeBillingSelection, resolveStripePriceId } from "@/lib/billing";
import { normalizeRelativeRedirect } from "@/lib/redirect";
import { getStripe } from "@/lib/stripe";
import { getOrgEntitlement } from "@/lib/convex";

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

  if (message.includes("similar object exists in") && message.includes("mode")) {
    return "Stripe key mode does not match the configured price IDs (test vs live mismatch).";
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

  if (message && message !== "Unknown checkout error") {
    return `Checkout setup error: ${message}`;
  }

  return "Unable to create checkout session with current Stripe configuration.";
}


function getCheckoutErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return {};
  }

  const stripeLike = error as {
    type?: unknown;
    code?: unknown;
    decline_code?: unknown;
    param?: unknown;
    requestId?: unknown;
    statusCode?: unknown;
    doc_url?: unknown;
  };

  return {
    errorType: typeof stripeLike.type === "string" ? stripeLike.type : undefined,
    errorCode: typeof stripeLike.code === "string" ? stripeLike.code : undefined,
    declineCode: typeof stripeLike.decline_code === "string" ? stripeLike.decline_code : undefined,
    errorParam: typeof stripeLike.param === "string" ? stripeLike.param : undefined,
    requestId: typeof stripeLike.requestId === "string" ? stripeLike.requestId : undefined,
    statusCode: typeof stripeLike.statusCode === "number" ? stripeLike.statusCode : undefined,
    docUrl: typeof stripeLike.doc_url === "string" ? stripeLike.doc_url : undefined,
  };
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

  return { url: session.url ?? null, selection };
}

export default async function CheckoutStartPage({ searchParams }: CheckoutStartPageProps) {
  const params = await searchParams;
  const { userId, orgId } = await auth();
  const selection = normalizeBillingSelection({ planId: params.plan, interval: params.interval });
  const returnTarget = `/checkout/start?plan=${selection.planId}&interval=${selection.interval}`;
  const orgSetupTarget = `/workspace/select-organization?redirect_url=${encodeURIComponent(returnTarget)}`;
  let checkoutHint =
    "Please retry your plan selection. If this keeps happening, verify Stripe price environment variables are configured for each plan interval.";

  if (!userId) {
    redirect(`/sign-up?plan=${selection.planId}&interval=${selection.interval}&redirect_url=${encodeURIComponent(returnTarget)}`);
  }
  if (!orgId) {
    redirect(orgSetupTarget);
  }
  const entitlement = await getOrgEntitlement({ orgId }).catch(() => null);
  if (entitlement?.mode === "paid") {
    redirect("/dashboard/trainer?tab=settings");
  }

  try {
    const result = await createCheckoutUrl(params.plan, params.interval, userId, orgId);
    if (result.url) {
      redirect(result.url);
    }
  } catch (error) {
    unstable_rethrow(error);
    checkoutHint = getCheckoutHint(error);
    const message = error instanceof Error ? error.message : "Unknown checkout error";
    const errorDetails = getCheckoutErrorDetails(error);
    console.error("[checkout/start] Failed to create checkout session", {
      plan: selection.planId,
      interval: selection.interval,
      orgId,
      userId,
      message,
      ...errorDetails,
    });
  }

  return (
    <div className="page">
      <div className="shell">
        <main>
          <section className="glass panel">
            <div className="tag">Checkout needs attention</div>
            <h3>We couldn&apos;t open secure checkout yet.</h3>
            <p className="disclaimer">{checkoutHint}</p>
            <p className="disclaimer">Use the actions below to retry or confirm your workspace context.</p>
            <div className="hero-actions">
              <Link className="button" href="/#pricing">
                Back to plans
              </Link>
              <Link className="button secondary" href={returnTarget}>
                Try again
              </Link>
              <Link className="button secondary" href={normalizeRelativeRedirect(orgSetupTarget, "/dashboard/trainer")}>
                Choose workspace
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
