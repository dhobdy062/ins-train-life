import Link from "next/link";
import PricingPlanImage from "@/components/PricingPlanImage";
import {
  BILLING_PLANS,
  BillingInterval,
  BillingPlanId,
  DEFAULT_BILLING_SELECTION,
  formatMinutesAsHours,
  formatPlanPrice,
} from "@/lib/billing";

type PricingCardsProps = {
  selectedPlanId?: BillingPlanId;
  selectedInterval?: BillingInterval;
};

function buildCheckoutHref(planId: BillingPlanId, interval: BillingInterval) {
  return `/checkout/start?plan=${planId}&interval=${interval}`;
}

export default function PricingCards({ selectedPlanId, selectedInterval }: PricingCardsProps) {
  const activePlanId = selectedPlanId ?? DEFAULT_BILLING_SELECTION.planId;
  const activeInterval = selectedInterval ?? DEFAULT_BILLING_SELECTION.interval;

  return (
    <div className="price-grid">
      {BILLING_PLANS.map((plan) => {
        const isSelectedPlan = plan.id === activePlanId;
        const monthlySelected = isSelectedPlan && activeInterval === "monthly";
        const annualSelected = isSelectedPlan && activeInterval === "annual";

        return (
          <article key={plan.id} className={`price-card${isSelectedPlan ? " selected" : ""}`}>
            <div className="plan-image-shell">
              <PricingPlanImage src={plan.imageSrc} alt={plan.imageAlt} />
            </div>
            <h4>{plan.name}</h4>
            <p className="disclaimer">{plan.tagline}</p>
            <div className="plan-capacity">
              <span>{plan.includedMinutesPerMonth.toLocaleString()} minutes / month</span>
              <span>{formatMinutesAsHours(plan.includedMinutesPerMonth)}</span>
            </div>
            <p className="price-row">
              <strong>{formatPlanPrice(plan.monthlyCents)}</strong>
              <span>/month</span>
            </p>
            <p className="price-row">
              <strong>{formatPlanPrice(plan.annualCents)}</strong>
              <span>/year</span>
            </p>
            <span className={`selected-pill${isSelectedPlan ? " active" : ""}`}>
              {isSelectedPlan ? `Selected interval: ${activeInterval}` : "Select an interval"}
            </span>
            <div className="hero-actions">
              <Link
                className={`button secondary${monthlySelected ? " plan-cta-selected" : ""}`}
                href={buildCheckoutHref(plan.id, "monthly")}
              >
                Choose monthly
              </Link>
              <Link
                className={`button secondary${annualSelected ? " plan-cta-selected" : ""}`}
                href={buildCheckoutHref(plan.id, "annual")}
              >
                Choose annual
              </Link>
            </div>
            <ul className="plan-features">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
