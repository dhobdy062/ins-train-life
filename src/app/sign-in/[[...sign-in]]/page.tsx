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
  const hasPricingSelection = Boolean(params.plan || params.interval);
  const hasCheckoutRedirect = typeof params.redirect_url === "string" && params.redirect_url.startsWith("/checkout");
  const isCheckoutFlow = hasPricingSelection || hasCheckoutRedirect;
  const fallbackTarget = isCheckoutFlow
    ? `/checkout/start?plan=${selection.planId}&interval=${selection.interval}`
    : "/workspace/dashboard";
  const redirectTarget = normalizeRelativeRedirect(params.redirect_url, fallbackTarget);

  return (
    <div className="page">
      <div className="shell">
        <div className="signin-layout">
          <section className="glass panel pricing-stack">
            <div className="tag">{isCheckoutFlow ? "Step 1 of 2: Pick plan" : "Secure sign in"}</div>
            <h3>{isCheckoutFlow ? "Sign in to continue to secure checkout." : "Sign in to open your workspace."}</h3>
            <p className="disclaimer">
              {isCheckoutFlow
                ? "Your selected interval stays attached after sign-in so billing stays aligned."
                : "After sign-in, we route you to your correct workspace automatically."}
            </p>
            {isCheckoutFlow ? (
              <PricingCards selectedPlanId={selection.planId} selectedInterval={selection.interval} signedIn={false} />
            ) : null}
          </section>
          <section className="signin-card">
            <SignIn forceRedirectUrl={redirectTarget} fallbackRedirectUrl={redirectTarget} />
          </section>
        </div>
      </div>
    </div>
  );
}
