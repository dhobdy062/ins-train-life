import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const goalDraft = v.object({
  goal: v.string(),
  metricTarget: v.string(),
  targetDate: v.string(),
  notes: v.string(),
});

const coachingDraft = v.object({
  topic: v.string(),
  focusType: v.string(),
  scheduledAt: v.string(),
  attendees: v.string(),
  agenda: v.string(),
});

const trainingPlans = v.object({
  day30: goalDraft,
  day60: goalDraft,
  day90: goalDraft,
  coaching: coachingDraft,
});

export const getOrgTrainerTrainingPlans = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trainerTrainingPlans")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!existing) {
      return null;
    }

    return {
      orgId: existing.orgId,
      plans: existing.plans,
      updatedBy: existing.updatedBy,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    };
  },
});

export const upsertOrgTrainerTrainingPlans = mutation({
  args: {
    orgId: v.string(),
    updatedBy: v.string(),
    plans: trainingPlans,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("trainerTrainingPlans")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        plans: args.plans,
        updatedBy: args.updatedBy,
        updatedAt: now,
      });

      return {
        configId: existing._id,
        created: false,
        updatedAt: now,
      };
    }

    const configId = await ctx.db.insert("trainerTrainingPlans", {
      orgId: args.orgId,
      plans: args.plans,
      updatedBy: args.updatedBy,
      createdAt: now,
      updatedAt: now,
    });

    return {
      configId,
      created: true,
      updatedAt: now,
    };
  },
});
