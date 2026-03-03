import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    primaryEmail: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncedAt: v.number(),
  }).index("by_clerkUserId", ["clerkUserId"]),

  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncedAt: v.number(),
  }).index("by_clerkOrgId", ["clerkOrgId"]),

  organizationMemberships: defineTable({
    clerkMembershipId: v.string(),
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.optional(v.string()),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncedAt: v.number(),
  })
    .index("by_clerkMembershipId", ["clerkMembershipId"])
    .index("by_org_user", ["clerkOrgId", "clerkUserId"])
    .index("by_clerkOrgId", ["clerkOrgId"])
    .index("by_clerkUserId", ["clerkUserId"]),

  webhookEvents: defineTable({
    provider: v.union(v.literal("stripe"), v.literal("vapi")),
    idempotencyKey: v.string(),
    providerEventId: v.optional(v.string()),
    status: v.union(v.literal("queued"), v.literal("processed"), v.literal("failed")),
    attemptCount: v.optional(v.number()),
    lastAttemptAt: v.optional(v.number()),
    maxAttempts: v.optional(v.number()),
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
    traineeId: v.optional(v.string()),
    assistantId: v.string(),
    difficulty: v.string(),
    objectionsRequired: v.number(),
    rebuttalKeys: v.array(v.string()),
    channel: v.literal("web"),
    identityMode: v.optional(v.union(v.literal("ip_match"), v.literal("backup_code"), v.literal("manual_override"))),
    ipHash: v.optional(v.string()),
    profileSnapshot: v.optional(
      v.object({
        difficultyLevel: v.string(),
        objectionsRequired: v.number(),
        expectedRebuttals: v.array(v.string()),
      }),
    ),
    recordingStorageId: v.optional(v.id("_storage")),
    transcriptStorageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("started"), v.literal("completed"), v.literal("abandoned")),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_sessionKey", ["sessionKey"])
    .index("by_org_createdAt", ["orgId", "createdAt"])
    .index("by_trainee_createdAt", ["traineeId", "createdAt"]),

  trainees: defineTable({
    orgId: v.string(),
    trainerId: v.string(),
    name: v.string(),
    email: v.string(),
    difficultyLevel: v.string(),
    numObjections: v.number(),
    expectedRebuttals: v.array(v.string()),
    inviteTokenHash: v.string(),
    status: v.union(v.literal("invited"), v.literal("active"), v.literal("disabled")),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActiveAt: v.optional(v.number()),
  })
    .index("by_org_createdAt", ["orgId", "createdAt"])
    .index("by_org_email", ["orgId", "email"])
    .index("by_inviteTokenHash", ["inviteTokenHash"]),

  trainerObjectionConfigs: defineTable({
    orgId: v.string(),
    objectionLibrary: v.object({
      D1: v.array(v.object({ text: v.string(), rebuttalType: v.string(), frequency: v.string() })),
      D2: v.array(v.object({ text: v.string(), rebuttalType: v.string(), frequency: v.string() })),
      D3: v.array(v.object({ text: v.string(), rebuttalType: v.string(), frequency: v.string() })),
      D4: v.array(v.object({ text: v.string(), rebuttalType: v.string(), frequency: v.string() })),
      D5: v.array(v.object({ text: v.string(), rebuttalType: v.string(), frequency: v.string() })),
    }),
    rebuttalGuides: v.record(v.string(), v.string()),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_orgId", ["orgId"]),

  traineeSessionIps: defineTable({
    orgId: v.string(),
    traineeId: v.id("trainees"),
    ipHash: v.string(),
    ipAddressMasked: v.optional(v.string()),
    consentedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ipHash", ["ipHash"])
    .index("by_traineeId", ["traineeId"])
    .index("by_org_trainee", ["orgId", "traineeId"]),

  trialSessions: defineTable({
    emailHash: v.string(),
    sessionKey: v.string(),
    source: v.literal("web_trial"),
    createdAt: v.number(),
  }).index("by_emailHash_createdAt", ["emailHash", "createdAt"]),

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

  rebuttalResponses: defineTable({
    sessionKey: v.string(),
    orgId: v.string(),
    traineeId: v.optional(v.string()),
    objectionId: v.optional(v.string()),
    rebuttalTypeExpected: v.optional(v.string()),
    agentResponse: v.string(),
    toneAnalysis: v.optional(v.string()),
    score: v.number(),
    grade: v.string(),
    feedback: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_sessionKey", ["sessionKey"])
    .index("by_org_createdAt", ["orgId", "createdAt"])
    .index("by_trainee_createdAt", ["traineeId", "createdAt"]),

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

  stripeCustomerOrgMap: defineTable({
    stripeCustomerId: v.string(),
    orgId: v.string(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_orgId", ["orgId"]),

  emailEvents: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_org_createdAt", ["orgId", "createdAt"])
    .index("by_recipientHash_createdAt", ["recipientHash", "createdAt"]),

  alertEvents: defineTable({
    source: v.string(),
    severity: v.union(v.literal("warning"), v.literal("critical")),
    message: v.string(),
    context: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
});
