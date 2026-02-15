import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createTrainingSession = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const sessionKey = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    await ctx.db.insert("trainingSessions", {
      sessionKey,
      orgId: args.orgId,
      trainerId: args.trainerId,
      traineeId: args.traineeId,
      assistantId: args.assistantId,
      difficulty: args.difficulty,
      objectionsRequired: args.objectionsRequired,
      rebuttalKeys: args.rebuttalKeys,
      channel: args.channel,
      identityMode: args.identityMode,
      ipHash: args.ipHash,
      profileSnapshot: args.profileSnapshot,
      status: "started",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { sessionKey };
  },
});

export const reserveTrialSession = mutation({
  args: {
    emailHash: v.string(),
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trialSessions")
      .withIndex("by_emailHash_createdAt", (q) => q.eq("emailHash", args.emailHash))
      .take(3);

    if (existing.length >= 3) {
      return { allowed: false, remaining: 0 };
    }

    await ctx.db.insert("trialSessions", {
      emailHash: args.emailHash,
      sessionKey: args.sessionKey,
      source: "web_trial",
      createdAt: Date.now(),
    });

    return { allowed: true, remaining: 3 - (existing.length + 1) };
  },
});

export const deleteSessionWithArtifacts = mutation({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trainingSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    const hasAccess = session.trainerId === args.userId || session.orgId === args.orgId;
    if (!hasAccess) {
      throw new Error("Unauthorized");
    }

    const responses = await ctx.db
      .query("rebuttalResponses")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .collect();

    for (const response of responses) {
      await ctx.db.delete(response._id);
    }

    await ctx.db.delete(session._id);

    return {
      success: true,
      deletedResponses: responses.length,
    };
  },
});
