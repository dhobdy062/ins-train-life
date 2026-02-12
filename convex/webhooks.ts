import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

export const enqueueWebhookEvent = mutation({
  args: {
    provider: v.union(v.literal("stripe"), v.literal("vapi")),
    idempotencyKey: v.string(),
    providerEventId: v.optional(v.string()),
    payload: v.any(),
    headers: v.optional(v.any()),
    receivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_provider_idempotency", (q) => q.eq("provider", args.provider).eq("idempotencyKey", args.idempotencyKey))
      .first();

    if (existing) {
      return { deduped: true, eventId: existing._id, status: existing.status };
    }

    const eventId = await ctx.db.insert("webhookEvents", {
      ...args,
      status: "queued",
    });

    await ctx.scheduler.runAfter(0, internal.webhooks.processWebhookEvent, { eventId });

    return { deduped: false, eventId, status: "queued" as const };
  },
});

export const processWebhookEvent = internalMutation({
  args: { eventId: v.id("webhookEvents") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.eventId);
    if (!record || record.status === "processed") {
      return;
    }

    try {
      if (record.provider === "stripe") {
        await persistStripeEvent(ctx, record.payload);
      } else {
        await persistVapiEvent(ctx, record.payload);
      }

      await ctx.db.patch(args.eventId, {
        status: "processed",
        processedAt: Date.now(),
        error: undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown processing error";
      await ctx.db.patch(args.eventId, {
        status: "failed",
        processedAt: Date.now(),
        error: message,
      });

      await ctx.db.insert("alertEvents", {
        source: `webhook:${record.provider}`,
        severity: "critical",
        message,
        context: {
          eventId: args.eventId,
          providerEventId: record.providerEventId,
        },
        createdAt: Date.now(),
      });
    }
  },
});

export const recordAlert = mutation({
  args: {
    source: v.string(),
    severity: v.union(v.literal("warning"), v.literal("critical")),
    message: v.string(),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("alertEvents", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const checkLaggingWebhooks = mutation({
  args: {
    maxLagMs: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const maxLagMs = Math.max(args.maxLagMs, 1);
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 500);

    const queued = await ctx.db.query("webhookEvents").withIndex("by_status", (q) => q.eq("status", "queued")).take(limit);

    const lagging = queued.filter((item) => now - item.receivedAt > maxLagMs);
    if (lagging.length > 0) {
      await ctx.db.insert("alertEvents", {
        source: "webhooks.checkLaggingWebhooks",
        severity: "warning",
        message: `${lagging.length} webhook(s) are lagging past ${maxLagMs}ms`,
        context: {
          sampleEventIds: lagging.slice(0, 10).map((item) => item._id),
        },
        createdAt: now,
      });
    }

    return {
      checked: queued.length,
      laggingCount: lagging.length,
    };
  },
});

export const getOrgBillingAccess = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 500);

    const events = await ctx.db
      .query("billingEvents")
      .withIndex("by_org_createdAt", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(limit);

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

    const hasCompletedCheckout = events.some((event) => event.eventType === "checkout.session.completed");
    if (hasCompletedCheckout) {
      return { hasAccess: true, reason: "checkout_completed" as const };
    }

    return { hasAccess: false, reason: "no_active_subscription" as const };
  },
});

async function persistStripeEvent(
  ctx: any,
  payload: any,
) {
  const providerEventId = asString(payload?.id);
  if (!providerEventId) {
    return;
  }

  const existing = await ctx.db
    .query("billingEvents")
    .withIndex("by_providerEventId", (q) => q.eq("providerEventId", providerEventId))
    .first();

  if (existing) {
    return;
  }

  const orgId =
    asString(payload?.data?.object?.metadata?.orgId) ||
    asString(payload?.data?.object?.client_reference_id) ||
    "unscoped";

  await ctx.db.insert("billingEvents", {
    providerEventId,
    orgId,
    stripeCustomerId: asString(payload?.data?.object?.customer),
    stripeSubscriptionId: asString(payload?.data?.object?.subscription),
    eventType: asString(payload?.type) || "unknown",
    amount: asNumber(payload?.data?.object?.amount_total),
    currency: asString(payload?.data?.object?.currency),
    status: asString(payload?.data?.object?.status),
    payload,
    createdAt: Date.now(),
  });

  await incrementUsageRollup(ctx, {
    orgId,
    day: dayKey(Date.now()),
    provider: "stripe",
    minutesToAdd: 0,
    sessionsToAdd: 0,
  });
}

async function persistVapiEvent(
  ctx: any,
  payload: any,
) {
  const call = payload?.call ?? payload?.message?.call ?? {};
  const message = payload?.message ?? payload;

  const sessionKey =
    asString(call?.id) || asString(payload?.callId) || asString(payload?.sessionId) || asString(payload?.id) || "unknown";

  const orgId =
    asString(call?.metadata?.orgId) ||
    asString(payload?.orgId) ||
    asString(payload?.metadata?.orgId) ||
    "unscoped";

  const eventType =
    asString(payload?.type) ||
    asString(message?.type) ||
    asString(payload?.event) ||
    "unknown";

  await ctx.db.insert("sessionMetrics", {
    sessionKey,
    orgId,
    providerEventId: asString(payload?.id) || asString(message?.id),
    eventType,
    durationSeconds: asNumber(call?.durationSeconds) || asNumber(payload?.durationSeconds),
    toneStrikeCount: asNumber(message?.analysis?.toneStrikeCount),
    rebuttalScore: asNumber(message?.analysis?.similarityScore),
    appointmentSet: asBoolean(message?.analysis?.appointmentSet),
    rawPayload: payload,
    createdAt: Date.now(),
  });

  const isEndEvent = /end|completed|report/i.test(eventType);
  const durationSeconds = asNumber(call?.durationSeconds) || asNumber(payload?.durationSeconds) || 0;

  await incrementUsageRollup(ctx, {
    orgId,
    day: dayKey(Date.now()),
    provider: "vapi",
    minutesToAdd: isEndEvent ? Math.ceil(durationSeconds / 60) : 0,
    sessionsToAdd: isEndEvent ? 1 : 0,
  });
}

async function incrementUsageRollup(
  ctx: any,
  args: {
    orgId: string;
    day: string;
    provider: "stripe" | "vapi";
    sessionsToAdd: number;
    minutesToAdd: number;
  },
) {
  const existing = await ctx.db
    .query("usageRollups")
    .withIndex("by_org_day_provider", (q) =>
      q.eq("orgId", args.orgId).eq("day", args.day).eq("provider", args.provider),
    )
    .first();

  if (!existing) {
    await ctx.db.insert("usageRollups", {
      orgId: args.orgId,
      day: args.day,
      provider: args.provider,
      sessionsTotal: args.sessionsToAdd,
      minutesTotal: args.minutesToAdd,
      updatedAt: Date.now(),
    });
    return;
  }

  await ctx.db.patch(existing._id, {
    sessionsTotal: existing.sessionsTotal + args.sessionsToAdd,
    minutesTotal: existing.minutesTotal + args.minutesToAdd,
    updatedAt: Date.now(),
  });
}

function dayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
