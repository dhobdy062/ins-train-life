import { SignIn } from "@clerk/nextjs";
import PricingCards from "@/components/PricingCards";
import { normalizeBillingSelection } from "@/lib/billing";
import { normalizeRelativeRedirect } from "@/lib/redirect";

type SignInPageProps = {
  searchParams: Promise<{ plan?: string; interval?: string; redirect_url?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const selection = normalizeBillingSelection({ planId: params.plan, interval: params.interval });
  const fallbackTarget = `/checkout/start?plan=${selection.planId}&interval=${selection.interval}`;
  const redirectTarget = normalizeRelativeRedirect(params.redirect_url, fallbackTarget);

  return (
    <div className="page">
      <div className="shell">
        <div className="signin-layout">
          <section className="glass panel pricing-stack">
            <div className="tag">Step 1 of 2: Pick plan</div>
            <h3>Sign in to continue to secure checkout.</h3>
            <p className="disclaimer">
              Your selected interval stays attached after sign-in so billing stays aligned.
            </p>
            <PricingCards selectedPlanId={selection.planId} selectedInterval={selection.interval} signedIn={false} />
          </section>
          <section className="signin-card">
            <SignIn forceRedirectUrl={redirectTarget} fallbackRedirectUrl={redirectTarget} />
          </section>
        </div>
      </div>
    </div>
  );
}
