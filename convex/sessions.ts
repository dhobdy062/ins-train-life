import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createTrainingSession = mutation({
  args: {
    orgId: v.string(),
    trainerId: v.string(),
    assistantId: v.string(),
    difficulty: v.string(),
    objectionsRequired: v.number(),
    rebuttalKeys: v.array(v.string()),
    channel: v.literal("web"),
  },
  handler: async (ctx, args) => {
    const sessionKey = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    await ctx.db.insert("trainingSessions", {
      sessionKey,
      orgId: args.orgId,
      trainerId: args.trainerId,
      assistantId: args.assistantId,
      difficulty: args.difficulty,
      objectionsRequired: args.objectionsRequired,
      rebuttalKeys: args.rebuttalKeys,
      channel: args.channel,
      status: "started",
      createdAt: Date.now(),
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
