import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const objectionRow = v.object({
  text: v.string(),
  rebuttalType: v.string(),
  frequency: v.string(),
});

const objectionLibrary = v.object({
  D1: v.array(objectionRow),
  D2: v.array(objectionRow),
  D3: v.array(objectionRow),
  D4: v.array(objectionRow),
  D5: v.array(objectionRow),
});

export const getOrgTrainerObjectionConfig = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trainerObjectionConfigs")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!existing) {
      return null;
    }

    return {
      orgId: existing.orgId,
      objectionLibrary: existing.objectionLibrary,
      rebuttalGuides: existing.rebuttalGuides,
      updatedBy: existing.updatedBy,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    };
  },
});

export const upsertOrgTrainerObjectionConfig = mutation({
  args: {
    orgId: v.string(),
    updatedBy: v.string(),
    objectionLibrary,
    rebuttalGuides: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("trainerObjectionConfigs")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        objectionLibrary: args.objectionLibrary,
        rebuttalGuides: args.rebuttalGuides,
        updatedBy: args.updatedBy,
        updatedAt: now,
      });
      return {
        configId: existing._id,
        created: false,
        updatedAt: now,
      };
    }

    const configId = await ctx.db.insert("trainerObjectionConfigs", {
      orgId: args.orgId,
      objectionLibrary: args.objectionLibrary,
      rebuttalGuides: args.rebuttalGuides,
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
