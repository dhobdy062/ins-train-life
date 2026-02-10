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
