import { SignIn } from "@clerk/nextjs";
import PricingCards from "@/components/PricingCards";
import { normalizeBillingSelection } from "@/lib/billing";

type SignInPageProps = {
  searchParams: Promise<{ plan?: string; interval?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const selection = normalizeBillingSelection({ planId: params.plan, interval: params.interval });

  return (
    <div className="page">
      <div className="shell">
        <div className="signin-layout">
          <section className="glass panel pricing-stack">
            <div className="tag">Select your plan</div>
            <h3>Sign in, then continue to checkout for your selected interval.</h3>
            <p className="disclaimer">
              Your monthly or annual choice stays attached to checkout so billing and access tiers stay aligned.
            </p>
            <PricingCards selectedPlanId={selection.planId} selectedInterval={selection.interval} />
          </section>
          <section className="signin-card">
            <SignIn />
          </section>
        </div>
      </div>
    </div>
  );
}
