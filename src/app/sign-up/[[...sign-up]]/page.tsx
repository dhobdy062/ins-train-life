import { SignUp } from "@clerk/nextjs";
import PricingCards from "@/components/PricingCards";
import SignupFlow from "@/components/SignupFlow";
import { normalizeBillingSelection } from "@/lib/billing";
import { normalizeRelativeRedirect } from "@/lib/redirect";

type SignUpPageProps = {
  searchParams: Promise<{ plan?: string; interval?: string; redirect_url?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const selection = normalizeBillingSelection({ planId: params.plan, interval: params.interval });
  const hasPricingSelection = Boolean(params.plan || params.interval);
  const hasCheckoutRedirect = typeof params.redirect_url === "string" && params.redirect_url.startsWith("/checkout");
  const isCheckoutFlow = hasPricingSelection || hasCheckoutRedirect;
  const fallbackTarget = isCheckoutFlow
    ? `/checkout/start?plan=${selection.planId}&interval=${selection.interval}`
    : `/checkout/start?plan=${selection.planId}&interval=${selection.interval}`;
  const redirectTarget = normalizeRelativeRedirect(params.redirect_url, fallbackTarget);
  const checkoutTarget = `/sign-up?plan=${selection.planId}&interval=${selection.interval}&redirect_url=${encodeURIComponent(
    `/checkout/start?plan=${selection.planId}&interval=${selection.interval}`,
  )}`;

  return (
    <div className="page">
      <div className="shell">
        {isCheckoutFlow ? (
          <div className="signin-layout">
            <section className="glass panel pricing-stack">
              <div className="tag">Step 1 of 2: Pick plan</div>
              <h3>Create your account to continue to secure checkout.</h3>
              <p className="disclaimer">Your selected interval stays locked in while you create your account.</p>
              <PricingCards selectedPlanId={selection.planId} selectedInterval={selection.interval} signedIn={false} />
            </section>
            <section className="signin-card">
              <SignUp forceRedirectUrl={redirectTarget} fallbackRedirectUrl={redirectTarget} />
            </section>
          </div>
        ) : (
          <SignupFlow redirectTarget={redirectTarget} checkoutTarget={checkoutTarget} />
        )}
      </div>
    </div>
  );
}
