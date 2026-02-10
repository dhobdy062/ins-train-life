export type BillingPlanId = "starter" | "pro" | "agency";
export type BillingInterval = "monthly" | "annual";

type BillingPriceConfig = {
  monthly: string;
  annual: string;
};

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  tagline: string;
  monthlyCents: number;
  annualCents: number;
  includedMinutesPerMonth: number;
  maxSeatsIncluded: number;
  additionalSeatMonthlyCents: number | null;
  overageCentsPerMinute: number;
  features: string[];
  stripePriceEnv: BillingPriceConfig;
};

export type BillingSelection = {
  planId: BillingPlanId;
  interval: BillingInterval;
};

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For solo agents validating scripts and objection handling.",
    monthlyCents: 7900,
    annualCents: 80600,
    includedMinutesPerMonth: 300,
    maxSeatsIncluded: 1,
    additionalSeatMonthlyCents: null,
    overageCentsPerMinute: 12,
    features: ["1 seat", "300 AI training minutes / month", "$0.12 per extra AI minute"],
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_STARTER_MONTHLY_ID",
      annual: "STRIPE_PRICE_STARTER_ANNUAL_ID",
    },
  },
  {
    id: "pro",
    name: "Pro Team",
    tagline: "For agencies coaching teams with custom scenarios.",
    monthlyCents: 24900,
    annualCents: 254000,
    includedMinutesPerMonth: 900,
    maxSeatsIncluded: 5,
    additionalSeatMonthlyCents: 3900,
    overageCentsPerMinute: 12,
    features: ["Up to 5 seats", "900 AI training minutes / month", "$39/additional seat/month"],
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_ID",
      annual: "STRIPE_PRICE_PRO_ANNUAL_ID",
    },
  },
  {
    id: "agency",
    name: "Agency Scale",
    tagline: "For high-volume teams with onboarding and compliance requirements.",
    monthlyCents: 69900,
    annualCents: 713000,
    includedMinutesPerMonth: 2500,
    maxSeatsIncluded: 20,
    additionalSeatMonthlyCents: 3900,
    overageCentsPerMinute: 12,
    features: ["Up to 20 seats", "2,500 AI training minutes / month", "Priority support + QA exports"],
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_AGENCY_MONTHLY_ID",
      annual: "STRIPE_PRICE_AGENCY_ANNUAL_ID",
    },
  },
];

export const DEFAULT_BILLING_SELECTION: BillingSelection = {
  planId: "pro",
  interval: "monthly",
};

const PLAN_ID_SET = new Set<BillingPlanId>(["starter", "pro", "agency"]);
const INTERVAL_SET = new Set<BillingInterval>(["monthly", "annual"]);

export function normalizeBillingSelection(input: unknown): BillingSelection {
  if (!input || typeof input !== "object") {
    return DEFAULT_BILLING_SELECTION;
  }

  const source = input as Record<string, unknown>;
  const planId = String(source.planId ?? "").toLowerCase() as BillingPlanId;
  const interval = String(source.interval ?? "").toLowerCase() as BillingInterval;

  return {
    planId: PLAN_ID_SET.has(planId) ? planId : DEFAULT_BILLING_SELECTION.planId,
    interval: INTERVAL_SET.has(interval) ? interval : DEFAULT_BILLING_SELECTION.interval,
  };
}

export function getBillingPlan(planId: BillingPlanId): BillingPlan {
  const plan = BILLING_PLANS.find((item) => item.id === planId);
  if (!plan) {
    return BILLING_PLANS.find((item) => item.id === DEFAULT_BILLING_SELECTION.planId) ?? BILLING_PLANS[0];
  }

  return plan;
}

export function resolveStripePriceId(selection: BillingSelection): { envKey: string; priceId: string | null } {
  const plan = getBillingPlan(selection.planId);
  const envKey = plan.stripePriceEnv[selection.interval];
  const priceId = process.env[envKey] ?? null;
  return { envKey, priceId };
}

export function formatPlanPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}
