import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const createTraineeProfile = mutation({
  args: {
    orgId: v.string(),
    trainerId: v.string(),
    name: v.string(),
    email: v.string(),
    difficultyLevel: v.string(),
    numObjections: v.number(),
    expectedRebuttals: v.array(v.string()),
    inviteTokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedEmail = normalizeEmail(args.email);

    const existing = await ctx.db
      .query("trainees")
      .withIndex("by_org_email", (q) => q.eq("orgId", args.orgId).eq("email", normalizedEmail))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        trainerId: args.trainerId,
        name: args.name,
        difficultyLevel: args.difficultyLevel,
        numObjections: args.numObjections,
        expectedRebuttals: args.expectedRebuttals,
        inviteTokenHash: args.inviteTokenHash,
        status: "invited",
        updatedAt: now,
      });

      return {
        traineeId: existing._id,
        created: false,
      };
    }

    const traineeId = await ctx.db.insert("trainees", {
      orgId: args.orgId,
      trainerId: args.trainerId,
      name: args.name,
      email: normalizedEmail,
      difficultyLevel: args.difficultyLevel,
      numObjections: args.numObjections,
      expectedRebuttals: args.expectedRebuttals,
      inviteTokenHash: args.inviteTokenHash,
      status: "invited",
      createdAt: now,
      updatedAt: now,
    });

    return {
      traineeId,
      created: true,
    };
  },
});

export const getTraineeByInviteTokenHash = query({
  args: {
    inviteTokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const trainee = await ctx.db
      .query("trainees")
      .withIndex("by_inviteTokenHash", (q) => q.eq("inviteTokenHash", args.inviteTokenHash))
      .first();

    if (!trainee || trainee.status === "disabled") {
      return null;
    }

    return {
      traineeId: trainee._id,
      orgId: trainee.orgId,
      trainerId: trainee.trainerId,
      name: trainee.name,
      email: trainee.email,
      difficultyLevel: trainee.difficultyLevel,
      numObjections: trainee.numObjections,
      expectedRebuttals: trainee.expectedRebuttals,
      status: trainee.status,
      lastActiveAt: trainee.lastActiveAt ?? null,
    };
  },
});

export const listTraineesByOrg = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    const trainees = await ctx.db
      .query("trainees")
      .withIndex("by_org_createdAt", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(limit);

    return trainees.map((trainee) => ({
      traineeId: trainee._id,
      name: trainee.name,
      email: trainee.email,
      difficultyLevel: trainee.difficultyLevel,
      numObjections: trainee.numObjections,
      expectedRebuttals: trainee.expectedRebuttals,
      status: trainee.status,
      updatedAt: trainee.updatedAt,
      lastActiveAt: trainee.lastActiveAt ?? null,
    }));
  },
});

export const linkTraineeIpByInviteTokenHash = mutation({
  args: {
    inviteTokenHash: v.string(),
    ipHash: v.string(),
    ipAddressMasked: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trainee = await ctx.db
      .query("trainees")
      .withIndex("by_inviteTokenHash", (q) => q.eq("inviteTokenHash", args.inviteTokenHash))
      .first();

    if (!trainee || trainee.status === "disabled") {
      throw new Error("Trainee invite is invalid or inactive.");
    }

    const now = Date.now();

    const existingLink = await ctx.db
      .query("traineeSessionIps")
      .withIndex("by_org_trainee", (q) => q.eq("orgId", trainee.orgId).eq("traineeId", trainee._id))
      .first();

    if (existingLink) {
      await ctx.db.patch(existingLink._id, {
        ipHash: args.ipHash,
        ipAddressMasked: args.ipAddressMasked,
        consentedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("traineeSessionIps", {
        orgId: trainee.orgId,
        traineeId: trainee._id,
        ipHash: args.ipHash,
        ipAddressMasked: args.ipAddressMasked,
        consentedAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(trainee._id, {
      status: "active",
      lastActiveAt: now,
      updatedAt: now,
    });

    return {
      traineeId: trainee._id,
      orgId: trainee.orgId,
      trainerId: trainee.trainerId,
      name: trainee.name,
      email: trainee.email,
      difficultyLevel: trainee.difficultyLevel,
      numObjections: trainee.numObjections,
      expectedRebuttals: trainee.expectedRebuttals,
      consentedAt: now,
    };
  },
});

export const getTraineeProfileByIpHash = query({
  args: {
    ipHash: v.string(),
  },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("traineeSessionIps")
      .withIndex("by_ipHash", (q) => q.eq("ipHash", args.ipHash))
      .collect();

    if (links.length === 0) {
      return null;
    }

    const latestLink = links.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    const trainee = await ctx.db.get(latestLink.traineeId);

    if (!trainee || trainee.status === "disabled") {
      return null;
    }

    return {
      traineeId: trainee._id,
      orgId: trainee.orgId,
      trainerId: trainee.trainerId,
      name: trainee.name,
      email: trainee.email,
      difficultyLevel: trainee.difficultyLevel,
      numObjections: trainee.numObjections,
      expectedRebuttals: trainee.expectedRebuttals,
      status: trainee.status,
      lastActiveAt: trainee.lastActiveAt ?? null,
    };
  },
});

export const markTraineeActive = mutation({
  args: {
    traineeId: v.id("trainees"),
  },
  handler: async (ctx, args) => {
    const trainee = await ctx.db.get(args.traineeId);
    if (!trainee) {
      throw new Error("Trainee not found");
    }

    const now = Date.now();
    await ctx.db.patch(trainee._id, {
      status: trainee.status === "disabled" ? "disabled" : "active",
      lastActiveAt: now,
      updatedAt: now,
    });

    return {
      traineeId: trainee._id,
      status: trainee.status === "disabled" ? "disabled" : "active",
      lastActiveAt: now,
    };
  },
});
