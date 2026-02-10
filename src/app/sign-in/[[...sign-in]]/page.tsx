import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { BILLING_PLANS, formatPlanPrice } from "@/lib/billing";

function buildSignInHref(planId: string, interval: "monthly" | "annual") {
  const redirectUrl = `/demo?plan=${planId}&interval=${interval}`;
  const encodedRedirect = encodeURIComponent(redirectUrl);
  return `/sign-in?plan=${planId}&interval=${interval}&redirect_url=${encodedRedirect}`;
}

export default function SignInPage() {
  return (
    <div className="page">
      <div className="shell">
        <div className="signin-layout">
          <section className="glass panel pricing-stack">
            <div className="tag">Billing automation model</div>
            <h3>Choose the plan before you sign in</h3>
            <p className="disclaimer">
              Stripe checkout supports plan + interval metadata, so subscriptions map directly to coaching access
              tiers.
            </p>
            <div className="price-grid">
              {BILLING_PLANS.map((plan) => (
                <article key={plan.id} className="price-card">
                  <h4>{plan.name}</h4>
                  <p className="disclaimer">{plan.tagline}</p>
                  <p className="price-row">
                    <strong>{formatPlanPrice(plan.monthlyCents)}</strong>
                    <span>/month</span>
                  </p>
                  <p className="price-row">
                    <strong>{formatPlanPrice(plan.annualCents)}</strong>
                    <span>/year</span>
                  </p>
                  <div className="hero-actions">
                    <Link className="button" href={buildSignInHref(plan.id, "monthly")}>
                      Select monthly
                    </Link>
                    <Link className="button secondary" href={buildSignInHref(plan.id, "annual")}>
                      Select annual
                    </Link>
                  </div>
                  <ul className="plan-features">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
          <section className="signin-card">
            <SignIn />
          </section>
        </div>
      </div>
    </div>
  );
}
