import { query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

type BillingPlanId = "starter" | "pro" | "agency";
type BillingInterval = "monthly" | "annual";
type CurrentPlanSource = "subscription_price" | "checkout_metadata" | "event_fallback";

type CurrentPlan = {
  planId: BillingPlanId;
  interval: BillingInterval | null;
  stripeStatus: string | null;
  source: CurrentPlanSource;
};

type BillingEvent = {
  _id: any;
  providerEventId?: string;
  orgId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  eventType: string;
  status?: string;
  payload?: any;
  createdAt: number;
};

const PLAN_PRICES_CENTS: Record<BillingPlanId, { monthly: number; annual: number }> = {
  starter: { monthly: 7900, annual: 80600 },
  pro: { monthly: 24900, annual: 254000 },
  agency: { monthly: 69900, annual: 713000 },
};

export const getOrganizationRevenueDashboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeLimit(args.limit);
    const organizations = await ctx.db.query("organizations").collect();

    const rows = await Promise.all(
      organizations.map(async (organization) => {
        const orgId = organization.clerkOrgId;
        const memberships = await ctx.db
          .query("organizationMemberships")
          .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", orgId))
          .collect();

        const activeTrainerCount = memberships.filter((membership) => membership.status === "active").length;
        const billingEvents = await getBillingEventsForOrg(ctx, orgId, 200);
        const billingAccess = resolveBillingAccess(billingEvents);
        const currentPlan = resolveCurrentPlan(billingEvents);
        const revenue = resolveRevenue(currentPlan, billingAccess.hasAccess);

        return {
          orgId,
          orgName: organization.name || organization.slug || orgId,
          orgStatus: organization.status,
          activeTrainerCount,
          billingStatus: billingAccess.reason,
          hasPaidAccess: billingAccess.hasAccess,
          mrrCents: revenue.mrrCents,
          arrCents: revenue.arrCents,
          latestBillingAt: billingEvents[0]?.createdAt ?? null,
          currentPlan: currentPlan
            ? {
                planId: currentPlan.planId,
                interval: currentPlan.interval,
                stripeStatus: currentPlan.stripeStatus,
                source: currentPlan.source,
              }
            : null,
        };
      }),
    );

    const filtered = rows.filter(
      (row) => row.orgStatus !== "deleted" || row.mrrCents > 0 || row.activeTrainerCount > 0,
    );

    const sorted = filtered
      .sort((a, b) => {
        if (b.arrCents !== a.arrCents) {
          return b.arrCents - a.arrCents;
        }
        if (b.mrrCents !== a.mrrCents) {
          return b.mrrCents - a.mrrCents;
        }
        if (b.activeTrainerCount !== a.activeTrainerCount) {
          return b.activeTrainerCount - a.activeTrainerCount;
        }
        return a.orgName.localeCompare(b.orgName);
      });

    const ranked = sorted.slice(0, limit);

    const totals = filtered.reduce(
      (acc, row) => {
        acc.mrrCents += row.mrrCents;
        acc.arrCents += row.arrCents;
        acc.activeTrainerCount += row.activeTrainerCount;
        acc.payingOrganizations += row.hasPaidAccess ? 1 : 0;
        return acc;
      },
      {
        mrrCents: 0,
        arrCents: 0,
        activeTrainerCount: 0,
        payingOrganizations: 0,
      },
    );

    return {
      generatedAt: Date.now(),
      totalOrganizations: filtered.length,
      ...totals,
      organizations: ranked,
    };
  },
});

function normalizeLimit(input: number | undefined) {
  return Math.min(Math.max(input ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
}

async function getBillingEventsForOrg(ctx: any, orgId: string, limit: number): Promise<BillingEvent[]> {
  const scopedEvents = await ctx.db
    .query("billingEvents")
    .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", orgId))
    .order("desc")
    .take(limit);

  const customerMappings = await ctx.db
    .query("stripeCustomerOrgMap")
    .withIndex("by_orgId", (q: any) => q.eq("orgId", orgId))
    .collect();

  const merged = new Map<string, BillingEvent>();
  for (const event of scopedEvents) {
    const key = event.providerEventId || String(event._id);
    merged.set(key, event);
  }

  for (const mapping of customerMappings) {
    const customerEvents = await ctx.db
      .query("billingEvents")
      .withIndex("by_stripeCustomerId_createdAt", (q: any) => q.eq("stripeCustomerId", mapping.stripeCustomerId))
      .order("desc")
      .take(limit);

    for (const event of customerEvents) {
      if (event.orgId !== orgId && event.orgId !== "unscoped") {
        continue;
      }
      const key = event.providerEventId || String(event._id);
      if (!merged.has(key)) {
        merged.set(key, event);
      }
    }
  }

  return [...merged.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

function resolveBillingAccess(
  events: Array<{
    stripeSubscriptionId?: string;
    status?: string;
    eventType: string;
    createdAt: number;
  }>,
) {
  if (events.length === 0) {
    return { hasAccess: false, reason: "no_billing_events" as const };
  }

  const allowedStatuses = new Set(["active", "trialing", "past_due"]);
  const deniedStatuses = new Set(["canceled", "unpaid", "incomplete_expired"]);
  const latestStatusBySubscription = new Map<string, string>();

  for (const event of events) {
    const subscriptionId = event.stripeSubscriptionId;
    const status = event.status?.toLowerCase();
    if (!subscriptionId || !status) {
      continue;
    }
    if (!allowedStatuses.has(status) && !deniedStatuses.has(status)) {
      continue;
    }
    if (!latestStatusBySubscription.has(subscriptionId)) {
      latestStatusBySubscription.set(subscriptionId, status);
    }
  }

  if (latestStatusBySubscription.size > 0) {
    const statuses = [...latestStatusBySubscription.values()];
    if (statuses.some((status) => allowedStatuses.has(status))) {
      return { hasAccess: true, reason: "subscription_active" as const };
    }
    if (statuses.every((status) => deniedStatuses.has(status))) {
      return { hasAccess: false, reason: "subscription_inactive" as const };
    }
    return { hasAccess: false, reason: "subscription_status_unknown" as const };
  }

  const latestCheckoutCompleted = events.find((event) => event.eventType === "checkout.session.completed");
  if (!latestCheckoutCompleted) {
    return { hasAccess: false, reason: "no_active_subscription" as const };
  }

  return { hasAccess: true, reason: "checkout_completed" as const };
}

function resolveCurrentPlan(events: Array<{ eventType: string; status?: string; payload?: any }>): CurrentPlan | null {
  if (events.length === 0) {
    return null;
  }

  const priceIdPlanMap = getStripePriceIdPlanMap();

  for (const event of events) {
    const stripeStatus = normalizeStripeStatus(event.status);
    if (!stripeStatus || !ACTIVE_SUBSCRIPTION_STATUSES.has(stripeStatus)) {
      continue;
    }

    const fromPrice = resolvePlanFromPriceIds(extractStripePriceIds(event.payload), priceIdPlanMap);
    if (fromPrice) {
      return {
        ...fromPrice,
        stripeStatus,
        source: "subscription_price",
      };
    }
  }

  for (const event of events) {
    if (event.eventType !== "checkout.session.completed") {
      continue;
    }
    const fromCheckoutMetadata = resolvePlanFromMetadata(event.payload);
    if (fromCheckoutMetadata) {
      return {
        ...fromCheckoutMetadata,
        stripeStatus: normalizeStripeStatus(event.status) ?? null,
        source: "checkout_metadata",
      };
    }
  }

  for (const event of events) {
    const fromPrice = resolvePlanFromPriceIds(extractStripePriceIds(event.payload), priceIdPlanMap);
    if (fromPrice) {
      return {
        ...fromPrice,
        stripeStatus: normalizeStripeStatus(event.status) ?? null,
        source: "event_fallback",
      };
    }
  }

  for (const event of events) {
    const fromMetadata = resolvePlanFromMetadata(event.payload);
    if (fromMetadata) {
      return {
        ...fromMetadata,
        stripeStatus: normalizeStripeStatus(event.status) ?? null,
        source: "event_fallback",
      };
    }
  }

  return null;
}

function resolveRevenue(plan: CurrentPlan | null, hasPaidAccess: boolean) {
  if (!plan || !hasPaidAccess) {
    return { mrrCents: 0, arrCents: 0 };
  }

  const prices = PLAN_PRICES_CENTS[plan.planId];
  if (!prices) {
    return { mrrCents: 0, arrCents: 0 };
  }

  if (plan.interval === "annual") {
    return {
      mrrCents: Math.round(prices.annual / 12),
      arrCents: prices.annual,
    };
  }

  return {
    mrrCents: prices.monthly,
    arrCents: prices.monthly * 12,
  };
}

function getStripePriceIdPlanMap() {
  const map = new Map<string, { planId: BillingPlanId; interval: BillingInterval }>();
  addStripePriceMapping(map, "STRIPE_PRICE_STARTER_MONTHLY_ID", "starter", "monthly");
  addStripePriceMapping(map, "STRIPE_PRICE_STARTER_ANNUAL_ID", "starter", "annual");
  addStripePriceMapping(map, "STRIPE_PRICE_PRO_MONTHLY_ID", "pro", "monthly");
  addStripePriceMapping(map, "STRIPE_PRICE_PRO_ANNUAL_ID", "pro", "annual");
  addStripePriceMapping(map, "STRIPE_PRICE_AGENCY_MONTHLY_ID", "agency", "monthly");
  addStripePriceMapping(map, "STRIPE_PRICE_AGENCY_ANNUAL_ID", "agency", "annual");
  return map;
}

function addStripePriceMapping(
  map: Map<string, { planId: BillingPlanId; interval: BillingInterval }>,
  envKey: string,
  planId: BillingPlanId,
  interval: BillingInterval,
) {
  const priceId = readEnvString(envKey);
  if (!priceId) {
    return;
  }
  map.set(priceId, { planId, interval });
}

function readEnvString(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractStripePriceIds(payload: any) {
  const object = payload?.data?.object ?? {};
  const candidates: unknown[] = [object?.price?.id, object?.price, object?.plan?.id, object?.plan];
  const collections = [object?.items?.data, object?.lines?.data];

  for (const collection of collections) {
    if (!Array.isArray(collection)) {
      continue;
    }
    for (const item of collection) {
      candidates.push(item?.price?.id, item?.price, item?.plan?.id, item?.plan);
    }
  }

  const seen = new Set<string>();
  const priceIds: string[] = [];
  for (const candidate of candidates) {
    const value = asString(candidate);
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    priceIds.push(value);
  }
  return priceIds;
}

function resolvePlanFromPriceIds(
  priceIds: string[],
  map: Map<string, { planId: BillingPlanId; interval: BillingInterval }>,
) {
  for (const priceId of priceIds) {
    const mapped = map.get(priceId);
    if (mapped) {
      return mapped;
    }
  }
  return null;
}

function resolvePlanFromMetadata(payload: any): { planId: BillingPlanId; interval: BillingInterval | null } | null {
  const metadata = payload?.data?.object?.metadata;
  const planId = normalizePlanId(metadata?.planId ?? metadata?.plan_id);
  if (!planId) {
    return null;
  }

  return {
    planId,
    interval: normalizeBillingInterval(metadata?.interval) ?? null,
  };
}

function normalizePlanId(value: unknown): BillingPlanId | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "starter" || normalized === "pro" || normalized === "agency") {
    return normalized;
  }
  return undefined;
}

function normalizeBillingInterval(value: unknown): BillingInterval | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "monthly" || normalized === "annual") {
    return normalized;
  }
  return undefined;
}

function normalizeStripeStatus(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
