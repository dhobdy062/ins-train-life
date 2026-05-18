import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { persistVapiEvent, persistStripeEvent } from "@/lib/webhook-processor";

const DEFAULT_BILLING_EVENT_LIMIT = 200;
const MAX_BILLING_EVENT_LIMIT = 500;
const ORG_TRIAL_MINUTES_LIMIT = 15;
const CHECKOUT_PROVISIONAL_ACCESS_MS = 15 * 60 * 1000;
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
        const attemptCount = (record.attemptCount ?? 0) + 1;

        if (attemptCount >= (record.maxAttempts ?? 3)) {
          await ctx.db.patch(args.eventId, {
            status: "failed",
            processedAt: Date.now(),
            error: message,
            attemptCount,
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
        } else {
          await ctx.db.patch(args.eventId, {
            status: "failed",
            processedAt: Date.now(),
            error: message,
            attemptCount,
          });

          const backoff = 2 ** attemptCount * 1000; // Exponential backoff
          await ctx.scheduler.runAfter(backoff, internal.webhooks.processWebhookEvent, { eventId: args.eventId });
        }
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

export const logEmailEvent = mutation({
  args: {
    provider: v.literal("resend"),
    eventType: v.string(),
    sequence: v.optional(v.string()),
    orgId: v.optional(v.string()),
    recipient: v.optional(v.string()),
    recipientHash: v.optional(v.string()),
    status: v.union(v.literal("sent"), v.literal("failed")),
    providerMessageId: v.optional(v.string()),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("emailEvents", {
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
    const limit = normalizeLimit(args.limit);
    const events = await getBillingEventsForOrg(ctx, args.orgId, limit);

    return resolveBillingAccess(events);
  },
});


export const getStripeCustomerForOrg = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const directMap = await ctx.db
      .query("stripeCustomerOrgMap")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .first();

    if (directMap?.stripeCustomerId) {
      return { stripeCustomerId: directMap.stripeCustomerId };
    }

    const latestEvent = await ctx.db
      .query("billingEvents")
      .withIndex("by_org_createdAt", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .first();

    return { stripeCustomerId: latestEvent?.stripeCustomerId ?? null };
  },
});
export const getOrgEntitlement = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeLimit(args.limit);
    const billingEvents = await getBillingEventsForOrg(ctx, args.orgId, limit);

    const billingAccess = resolveBillingAccess(billingEvents);
    const currentPlan = resolveCurrentPlan(billingEvents);
    const usageRecords = await ctx.db
      .query("usageRollups")
      .withIndex("by_org_day_provider", (q) => q.eq("orgId", args.orgId))
      .collect();

    const minutesUsed = usageRecords.reduce((total, record) => {
      if (record.provider !== "vapi") {
        return total;
      }
      return total + Math.max(record.minutesTotal, 0);
    }, 0);

    const minutesRemaining = Math.max(ORG_TRIAL_MINUTES_LIMIT - minutesUsed, 0);
    if (billingAccess.hasAccess) {
      return {
        mode: "paid" as const,
        minutesUsed,
        minutesLimit: null,
        minutesRemaining,
        reason: billingAccess.reason,
        currentPlan,
      };
    }

    if (minutesRemaining === 0) {
      return {
        mode: "blocked" as const,
        minutesUsed,
        minutesLimit: ORG_TRIAL_MINUTES_LIMIT,
        minutesRemaining,
        reason: "trial_limit_reached" as const,
        currentPlan,
      };
    }

    return {
      mode: "trial" as const,
      minutesUsed,
      minutesLimit: ORG_TRIAL_MINUTES_LIMIT,
      minutesRemaining,
      reason: "provisional_access" as const,
      currentPlan,
    };
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
    .withIndex("by_providerEventId", (q: any) => q.eq("providerEventId", providerEventId))
    .first();

  if (existing) {
    return;
  }

  const eventType = asString(payload?.type) || "unknown";
  const stripeCustomerId = extractStripeCustomerId(payload);
  const stripeSubscriptionId = extractStripeSubscriptionId(payload);

  let orgId: string | undefined;

  if (stripeCustomerId) {
    const mapped = await ctx.db
      .query("stripeCustomerOrgMap")
      .withIndex("by_stripeCustomerId", (q: any) => q.eq("stripeCustomerId", stripeCustomerId))
      .first();

    if (mapped?.orgId) {
      orgId = mapped.orgId;
    }
  }

  if (!orgId) {
    const stripeUserId = extractStripeUserId(payload);
    if (stripeUserId) {
      orgId = await resolveOrgIdFromStripeUser(ctx, stripeUserId);
    }
  }

  if (stripeCustomerId && orgId) {
    await upsertStripeCustomerOrgMap(ctx, {
      stripeCustomerId,
      orgId,
    });
  }

  const finalOrgId = orgId || "unscoped";

  await ctx.db.insert("billingEvents", {
    providerEventId,
    orgId: finalOrgId,
    stripeCustomerId,
    stripeSubscriptionId,
    eventType,
    amount: asNumber(payload?.data?.object?.amount_total),
    currency: asString(payload?.data?.object?.currency),
    status: asString(payload?.data?.object?.status),
    payload,
    createdAt: Date.now(),
  });

  await incrementUsageRollup(ctx, {
    orgId: finalOrgId,
    day: dayKey(Date.now()),
    provider: "stripe",
    minutesToAdd: 0,
    sessionsToAdd: 0,
  });
}

async function upsertStripeCustomerOrgMap(
  ctx: any,
  args: {
    stripeCustomerId: string;
    orgId: string;
  },
) {
  const existing = await ctx.db
    .query("stripeCustomerOrgMap")
    .withIndex("by_stripeCustomerId", (q: any) => q.eq("stripeCustomerId", args.stripeCustomerId))
    .first();

  const now = Date.now();

  if (!existing) {
    await ctx.db.insert("stripeCustomerOrgMap", {
      stripeCustomerId: args.stripeCustomerId,
      orgId: args.orgId,
      firstSeenAt: now,
      lastSeenAt: now,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.patch(existing._id, {
    orgId: args.orgId,
    lastSeenAt: now,
    updatedAt: now,
  });
}

async function resolveOrgIdFromStripeUser(
  ctx: any,
  clerkUserId: string,
) {
  const memberships = await ctx.db
    .query("organizationMemberships")
    .withIndex("by_clerkUserId", (q: any) => q.eq("clerkUserId", clerkUserId))
    .collect();

  if (memberships.length === 0) {
    return undefined;
  }

  const activeMemberships = memberships.filter((membership: any) => membership.status === "active");
  if (activeMemberships.length === 1) {
    return asString(activeMemberships[0].clerkOrgId);
  }

  if (activeMemberships.length > 1) {
    const byUpdated = [...activeMemberships].sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    return asString(byUpdated[0]?.clerkOrgId);
  }

  const byUpdated = [...memberships].sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  return asString(byUpdated[0]?.clerkOrgId);
}

async function persistVapiEvent(
  ctx: any,
  payload: any,
) {
  const call = payload?.call ?? payload?.message?.call ?? {};
  const message = payload?.message ?? payload;
  const metadata = call?.metadata ?? payload?.metadata ?? message?.metadata ?? {};

  const sessionKey =
    asString(metadata?.sessionKey) ||
    asString(metadata?.session_key) ||
    asString(payload?.sessionKey) ||
    asString(payload?.session_key) ||
    asString(call?.id) ||
    asString(payload?.callId) ||
    asString(payload?.sessionId) ||
    asString(payload?.id) ||
    "unknown";

  const orgId =
    asString(metadata?.orgId) ||
    asString(metadata?.org_id) ||
    asString(call?.orgId) ||
    asString(call?.org_id) ||
    asString(payload?.orgId) ||
    asString(payload?.org_id) ||
    asString(payload?.metadata?.orgId) ||
    asString(payload?.metadata?.org_id) ||
    "unscoped";

  const eventType =
    asString(payload?.type) ||
    asString(message?.type) ||
    asString(payload?.event) ||
    "unknown";

  const durationSeconds = asNumber(call?.durationSeconds) || asNumber(payload?.durationSeconds) || 0;
  const structuredOutcome = extractStructuredOutcomeFromWebhookPayload(payload);

  await ctx.db.insert("sessionMetrics", {
    sessionKey,
    orgId,
    providerEventId: asString(payload?.id) || asString(message?.id),
    eventType,
    durationSeconds: durationSeconds > 0 ? durationSeconds : undefined,
    toneStrikeCount: asNumber(message?.analysis?.toneStrikeCount),
    rebuttalScore: structuredOutcome.rebuttalPerformanceScore,
    appointmentSet: structuredOutcome.appointmentSet,
    rawPayload: payload,
    createdAt: Date.now(),
  });

  const isEndEvent = /end|completed|report/i.test(eventType);

  await incrementUsageRollup(ctx, {
    orgId,
    day: dayKey(Date.now()),
    provider: "vapi",
    minutesToAdd: isEndEvent ? Math.ceil(durationSeconds / 60) : 0,
    sessionsToAdd: isEndEvent ? 1 : 0,
  });

  if (!isEndEvent || sessionKey === "unknown") {
    return;
  }

  const endedAt = extractTimestampMs(payload) ?? Date.now();
  let shouldTriggerAutomaticEvaluation = false;

  try {
    const completion = await ctx.runMutation(internal.sessions.markSessionCompletedFromWebhook, {
      sessionKey,
      endedAt,
      sourceEventType: eventType,
    });

    if (!completion?.found) {
      await ctx.db.insert("alertEvents", {
        source: "webhooks.persistVapiEvent",
        severity: "warning",
        message: "VAPI end event could not be matched to an existing training session",
        context: {
          sessionKey,
          eventType,
        },
        createdAt: Date.now(),
      });
      return;
    }

    shouldTriggerAutomaticEvaluation = true;
  } catch (error) {
    await ctx.db.insert("alertEvents", {
      source: "webhooks.persistVapiEvent",
      severity: "warning",
      message: `Failed to mark session complete from webhook: ${error instanceof Error ? error.message : "unknown"}`,
      context: {
        sessionKey,
        eventType,
      },
      createdAt: Date.now(),
    });
  }

  const session = await ctx.db
    .query("trainingSessions")
    .withIndex("by_sessionKey", (q: any) => q.eq("sessionKey", sessionKey))
    .first();
  const persistedStructuredOutcome = buildPersistableStructuredOutcome(structuredOutcome, {
    providerEventId: asString(payload?.id) || asString(message?.id),
    capturedAt: Date.now(),
  });
  if (session && persistedStructuredOutcome) {
    await ctx.db.patch(session._id, {
      structuredOutcome: persistedStructuredOutcome,
      updatedAt: Date.now(),
    });
  }

  await persistWebhookSessionArtifacts(ctx, {
    sessionKey,
    eventType,
    payload,
  });

  if (shouldTriggerAutomaticEvaluation) {
    await triggerAutomaticSessionEvaluation(ctx, sessionKey);
  }
}

async function persistWebhookSessionArtifacts(
  ctx: any,
  args: {
    sessionKey: string;
    eventType: string;
    payload: any;
  },
) {
  const session = await ctx.db
    .query("trainingSessions")
    .withIndex("by_sessionKey", (q: any) => q.eq("sessionKey", args.sessionKey))
    .first();

  if (!session) {
    return;
  }

  const recordingAsset = extractRecordingAsset(args.payload);
  const transcriptAsset = extractTranscriptAsset(args.payload);

  if (!recordingAsset && !transcriptAsset) {
    await ctx.db.insert("alertEvents", {
      source: "webhooks.persistWebhookSessionArtifacts",
      severity: "warning",
      message: "VAPI end event had no recording or transcript artifacts to persist",
      context: {
        sessionKey: args.sessionKey,
        eventType: args.eventType,
      },
      createdAt: Date.now(),
    });
    return;
  }

  const patch: {
    recordingStorageId?: string;
    transcriptStorageId?: string;
    updatedAt: number;
  } = {
    updatedAt: Date.now(),
  };

  if (recordingAsset) {
    try {
      const recordingBlob = await materializeRecordingBlob(recordingAsset);
      patch.recordingStorageId = await ctx.storage.store(recordingBlob);
    } catch (error) {
      await ctx.db.insert("alertEvents", {
        source: "webhooks.persistWebhookSessionArtifacts",
        severity: "warning",
        message: `Unable to persist recording artifact: ${error instanceof Error ? error.message : "unknown"}`,
        context: {
          sessionKey: args.sessionKey,
          eventType: args.eventType,
        },
        createdAt: Date.now(),
      });
    }
  }

  if (transcriptAsset) {
    try {
      const transcriptBlob = await materializeTranscriptBlob(transcriptAsset);
      patch.transcriptStorageId = await ctx.storage.store(transcriptBlob);
    } catch (error) {
      await ctx.db.insert("alertEvents", {
        source: "webhooks.persistWebhookSessionArtifacts",
        severity: "warning",
        message: `Unable to persist transcript artifact: ${error instanceof Error ? error.message : "unknown"}`,
        context: {
          sessionKey: args.sessionKey,
          eventType: args.eventType,
        },
        createdAt: Date.now(),
      });
    }
  }

  if (patch.recordingStorageId || patch.transcriptStorageId) {
    await ctx.db.patch(session._id, patch);
  }
}

async function triggerAutomaticSessionEvaluation(
  ctx: any,
  sessionKey: string,
) {
  try {
    await upsertAutomaticEvaluationForSessionInContext(ctx, {
      sessionKey,
    });
  } catch (error) {
    await ctx.db.insert("alertEvents", {
      source: "webhooks.triggerAutomaticSessionEvaluation",
      severity: "warning",
      message: `Unable to persist training session evaluation: ${error instanceof Error ? error.message : "unknown"}`,
      context: {
        sessionKey,
      },
      createdAt: Date.now(),
    });
  }
}

function buildPersistableStructuredOutcome(
  structuredOutcome: {
    rebuttalPerformanceScore?: number;
    appointmentSet?: boolean;
    callSummary?: string;
  },
  metadata: {
    providerEventId?: string;
    capturedAt: number;
  },
) {
  const candidate = {
    rebuttalPerformanceScore: structuredOutcome.rebuttalPerformanceScore,
    appointmentSet: structuredOutcome.appointmentSet,
    callSummary: structuredOutcome.callSummary,
    capturedAt: metadata.capturedAt,
    providerEventId: metadata.providerEventId,
  };

  return hasMeaningfulStructuredOutcome(candidate) ? candidate : null;
}

function extractRecordingAsset(payload: any): { kind: "base64" | "url"; value: string; mimeType?: string } | null {
  const call = payload?.call ?? payload?.message?.call ?? {};
  const message = payload?.message ?? payload;

  const url =
    asString(call?.recordingUrl) ||
    asString(call?.recording?.url) ||
    asString(message?.recordingUrl) ||
    asString(message?.recording?.url) ||
    asString(payload?.recordingUrl);

  if (url) {
    return {
      kind: "url",
      value: url,
      mimeType:
        asString(call?.recording?.mimeType) ||
        asString(message?.recording?.mimeType) ||
        asString(payload?.recordingMimeType),
    };
  }

  const candidate = asString(call?.recording) || asString(message?.recording) || asString(payload?.recording);
  if (!candidate) {
    return null;
  }

  if (/^https?:\/\//i.test(candidate)) {
    return {
      kind: "url",
      value: candidate,
      mimeType: asString(payload?.recordingMimeType),
    };
  }

  return {
    kind: "base64",
    value: candidate,
    mimeType: asString(payload?.recordingMimeType) || "audio/wav",
  };
}

function extractTranscriptAsset(payload: any): { kind: "text" | "url"; value: string } | null {
  const call = payload?.call ?? payload?.message?.call ?? {};
  const message = payload?.message ?? payload;

  const url =
    asString(call?.transcriptUrl) ||
    asString(message?.transcriptUrl) ||
    asString(payload?.transcriptUrl);

  if (url) {
    return {
      kind: "url",
      value: url,
    };
  }

  const transcriptValue = message?.transcript ?? payload?.transcript ?? call?.transcript;
  if (typeof transcriptValue === "string" && transcriptValue.trim().length > 0) {
    return {
      kind: "text",
      value: transcriptValue,
    };
  }

  if (typeof transcriptValue === "object" && transcriptValue !== null) {
    const maybeText = asString((transcriptValue as { text?: unknown }).text);
    if (maybeText) {
      return {
        kind: "text",
        value: maybeText,
      };
    }

    const serialized = JSON.stringify(transcriptValue);
    if (serialized && serialized !== "{}") {
      return {
        kind: "text",
        value: serialized,
      };
    }
  }

  return null;
}

async function materializeRecordingBlob(asset: { kind: "base64" | "url"; value: string; mimeType?: string }) {
  if (asset.kind === "url") {
    const response = await fetch(asset.value);
    if (!response.ok) {
      throw new Error(`Recording download failed with status ${response.status}`);
    }

    const bytes = await response.arrayBuffer();
    const contentType = asset.mimeType || response.headers.get("content-type") || "audio/wav";
    return new Blob([bytes], { type: contentType });
  }

  const bytes = decodeBase64(asset.value);
  return new Blob([bytes], { type: asset.mimeType || "audio/wav" });
}

async function materializeTranscriptBlob(asset: { kind: "text" | "url"; value: string }) {
  if (asset.kind === "url") {
    const response = await fetch(asset.value);
    if (!response.ok) {
      throw new Error(`Transcript download failed with status ${response.status}`);
    }

    const text = await response.text();
    return new Blob([text], { type: "text/plain" });
  }

  return new Blob([asset.value], { type: "text/plain" });
}

function decodeBase64(input: string) {
  const normalized = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
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

function normalizeLimit(limit: number | undefined) {
  return Math.min(Math.max(limit ?? DEFAULT_BILLING_EVENT_LIMIT, 1), MAX_BILLING_EVENT_LIMIT);
}

async function getBillingEventsForOrg(
  ctx: any,
  orgId: string,
  limit: number,
) {
  const scopedEvents = await ctx.db
    .query("billingEvents")
    .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", orgId))
    .order("desc")
    .take(limit);

  const customerMap = await ctx.db
    .query("stripeCustomerOrgMap")
    .withIndex("by_orgId", (q: any) => q.eq("orgId", orgId))
    .order("desc")
    .first();

  const merged = new Map<string, (typeof scopedEvents)[number]>();

  for (const event of scopedEvents) {
    const dedupeKey = event.providerEventId || String(event._id);
    merged.set(dedupeKey, event);
  }

  if (customerMap?.stripeCustomerId) {
    const customerEvents = await ctx.db
      .query("billingEvents")
      .withIndex("by_stripeCustomerId_createdAt", (q: any) => q.eq("stripeCustomerId", customerMap.stripeCustomerId))
      .order("desc")
      .take(limit);

    for (const event of customerEvents) {
      if (event.orgId !== orgId && event.orgId !== "unscoped") {
        continue;
      }
      const dedupeKey = event.providerEventId || String(event._id);
      if (!merged.has(dedupeKey)) {
        merged.set(dedupeKey, event);
      }
    }
  }

  const unscopedEvents = await ctx.db
    .query("billingEvents")
    .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", "unscoped"))
    .order("desc")
    .take(limit);

  const userOrgCache = new Map<string, string | undefined>();

  for (const event of unscopedEvents) {
    const inferredUserId = extractStripeUserId(event.payload);
    if (!inferredUserId) {
      continue;
    }

    if (!userOrgCache.has(inferredUserId)) {
      const resolvedOrg = await resolveOrgIdFromStripeUser(ctx, inferredUserId);
      userOrgCache.set(inferredUserId, resolvedOrg);
    }

    const resolvedOrgId = userOrgCache.get(inferredUserId);
    if (resolvedOrgId !== orgId) {
      continue;
    }

    const dedupeKey = event.providerEventId || String(event._id);
    if (!merged.has(dedupeKey)) {
      merged.set(dedupeKey, event);
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

  if (Date.now() - latestCheckoutCompleted.createdAt <= CHECKOUT_PROVISIONAL_ACCESS_MS) {
    return { hasAccess: true, reason: "checkout_provisional" as const };
  }

  return { hasAccess: true, reason: "checkout_completed" as const };
}

function resolveCurrentPlan(
  events: Array<{
    eventType: string;
    status?: string;
    payload?: any;
  }>,
): CurrentPlan | null {
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

function getStripePriceIdPlanMap() {
  const priceIdPlanMap = new Map<string, { planId: BillingPlanId; interval: BillingInterval }>();

  addStripePriceMapping(priceIdPlanMap, "STRIPE_PRICE_STARTER_MONTHLY_ID", "starter", "monthly");
  addStripePriceMapping(priceIdPlanMap, "STRIPE_PRICE_STARTER_ANNUAL_ID", "starter", "annual");
  addStripePriceMapping(priceIdPlanMap, "STRIPE_PRICE_PRO_MONTHLY_ID", "pro", "monthly");
  addStripePriceMapping(priceIdPlanMap, "STRIPE_PRICE_PRO_ANNUAL_ID", "pro", "annual");
  addStripePriceMapping(priceIdPlanMap, "STRIPE_PRICE_AGENCY_MONTHLY_ID", "agency", "monthly");
  addStripePriceMapping(priceIdPlanMap, "STRIPE_PRICE_AGENCY_ANNUAL_ID", "agency", "annual");

  return priceIdPlanMap;
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

  map.set(priceId, {
    planId,
    interval,
  });
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
  const candidates: unknown[] = [
    object?.price?.id,
    object?.price,
    object?.plan?.id,
    object?.plan,
  ];

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

function extractStripeCustomerId(payload: any): string | undefined {
  return asString(payload?.data?.object?.customer) || asString(payload?.data?.object?.customer?.id);
}

function extractStripeSubscriptionId(payload: any): string | undefined {
  const object = payload?.data?.object;
  return (
    asString(object?.subscription) ||
    asString(object?.subscription?.id) ||
    // customer.subscription.* payloads use the subscription object itself.
    (asString(object?.object) === "subscription" ? asString(object?.id) : undefined)
  );
}

function extractStripeUserId(payload: any): string | undefined {
  const object = payload?.data?.object;
  const metadata = object?.metadata;
  const subscriptionDetailsMetadata = object?.subscription_details?.metadata;
  const expandedSubscriptionMetadata = object?.subscription?.metadata;

  return (
    asString(metadata?.userId) ||
    asString(metadata?.user_id) ||
    asString(subscriptionDetailsMetadata?.userId) ||
    asString(subscriptionDetailsMetadata?.user_id) ||
    asString(expandedSubscriptionMetadata?.userId) ||
    asString(expandedSubscriptionMetadata?.user_id)
  );
}

function extractTimestampMs(payload: any): number | undefined {
  const candidates: unknown[] = [
    payload?.message?.endedAt,
    payload?.message?.timestamp,
    payload?.endedAt,
    payload?.timestamp,
    payload?.call?.endedAt,
    payload?.call?.endTime,
    payload?.created,
  ];

  for (const candidate of candidates) {
    const resolved = normalizeTimestamp(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

function normalizeTimestamp(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1_000_000_000_000) {
      return value;
    }
    if (value > 1_000_000_000) {
      return value * 1000;
    }
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return normalizeTimestamp(numeric);
    }

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
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
