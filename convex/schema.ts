import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  webhookEvents: defineTable({
    provider: v.union(v.literal("stripe"), v.literal("vapi")),
    idempotencyKey: v.string(),
    providerEventId: v.optional(v.string()),
    status: v.union(v.literal("queued"), v.literal("processed"), v.literal("failed")),
    payload: v.any(),
    headers: v.optional(v.any()),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_provider_idempotency", ["provider", "idempotencyKey"])
    .index("by_status", ["status"])
    .index("by_receivedAt", ["receivedAt"]),

  trainingSessions: defineTable({
    sessionKey: v.string(),
    orgId: v.string(),
    trainerId: v.string(),
    assistantId: v.string(),
    difficulty: v.string(),
    objectionsRequired: v.number(),
    rebuttalKeys: v.array(v.string()),
    channel: v.literal("web"),
    status: v.union(v.literal("started"), v.literal("completed"), v.literal("abandoned")),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_sessionKey", ["sessionKey"])
    .index("by_org_createdAt", ["orgId", "createdAt"]),

  sessionMetrics: defineTable({
    sessionKey: v.string(),
    orgId: v.string(),
    providerEventId: v.optional(v.string()),
    eventType: v.string(),
    durationSeconds: v.optional(v.number()),
    toneStrikeCount: v.optional(v.number()),
    rebuttalScore: v.optional(v.number()),
    appointmentSet: v.optional(v.boolean()),
    rawPayload: v.any(),
    createdAt: v.number(),
  })
    .index("by_sessionKey", ["sessionKey"])
    .index("by_org_createdAt", ["orgId", "createdAt"]),

  usageRollups: defineTable({
    orgId: v.string(),
    provider: v.union(v.literal("stripe"), v.literal("vapi")),
    day: v.string(),
    sessionsTotal: v.number(),
    minutesTotal: v.number(),
    updatedAt: v.number(),
  }).index("by_org_day_provider", ["orgId", "day", "provider"]),

  billingEvents: defineTable({
    providerEventId: v.string(),
    orgId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    eventType: v.string(),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    status: v.optional(v.string()),
    payload: v.any(),
    createdAt: v.number(),
  })
    .index("by_providerEventId", ["providerEventId"])
    .index("by_org_createdAt", ["orgId", "createdAt"]),

  alertEvents: defineTable({
    source: v.string(),
    severity: v.union(v.literal("warning"), v.literal("critical")),
    message: v.string(),
    context: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
});
