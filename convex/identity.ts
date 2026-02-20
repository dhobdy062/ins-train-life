import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function valueOrUndefined(value?: string | null) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTimestamp(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

export const getUserByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
  },
});

export const syncUserRoleFromClerk = mutation({
  args: {
    clerkUserId: v.string(),
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    // This is a backup sync mechanism when webhooks fail
    // It fetches the user's role directly from Clerk and updates our local membership
    
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY not configured");
    }

    try {
      // Fetch organization memberships for this user from Clerk
      const response = await fetch(
        `https://api.clerk.com/v1/organizations/${args.clerkOrgId}/memberships`,
        {
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Clerk API error: ${response.status}`);
      }

      const data = await response.json();
      const memberships = Array.isArray(data.data) ? data.data : [];
      
      // Find this user's membership
      const userMembership = memberships.find(
        (m: any) => (m.user_id === args.clerkUserId || m.public_user_data?.user_id === args.clerkUserId)
      );

      if (!userMembership) {
        return { success: false, reason: "membership_not_found" };
      }

      const role = userMembership.role || "member";
      const status = userMembership.status || "active";

      // Update the local membership record
      const existingMembership = await ctx.db
        .query("organizationMemberships")
        .withIndex("by_org_user", (q) => 
          q.eq("clerkOrgId", args.clerkOrgId).eq("clerkUserId", args.clerkUserId)
        )
        .first();

      if (!existingMembership) {
        return { success: false, reason: "local_membership_not_found" };
      }

      await ctx.db.patch(existingMembership._id, {
        role,
        status,
        lastSyncedAt: Date.now(),
      });

      return { 
        success: true, 
        role, 
        status,
        clerkMembershipId: userMembership.id 
      };

    } catch (error) {
      console.error("Failed to sync user role from Clerk:", error);
      return { success: false, reason: "api_error", error: String(error) };
    }
  },
});

export const getOrganizationByClerkId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();
  },
});

export const getMembershipByClerkId = query({
  args: { clerkMembershipId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("organizationMemberships")
      .withIndex("by_clerkMembershipId", (q) => q.eq("clerkMembershipId", args.clerkMembershipId))
      .first();
  },
});

export const upsertUser = mutation({
  args: {
    clerkUserId: v.string(),
    primaryEmail: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    const nextCreatedAt = normalizeTimestamp(args.createdAt, existing?.createdAt ?? now);
    const nextUpdatedAt = normalizeTimestamp(args.updatedAt, now);

    const patch = {
      clerkUserId: args.clerkUserId,
      primaryEmail: valueOrUndefined(args.primaryEmail),
      firstName: valueOrUndefined(args.firstName),
      lastName: valueOrUndefined(args.lastName),
      fullName: valueOrUndefined(args.fullName),
      imageUrl: valueOrUndefined(args.imageUrl),
      status: valueOrUndefined(args.status) ?? "active",
      createdAt: nextCreatedAt,
      updatedAt: nextUpdatedAt,
      lastSyncedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return ctx.db.insert("users", patch);
  },
});

export const upsertOrganization = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    const nextCreatedAt = normalizeTimestamp(args.createdAt, existing?.createdAt ?? now);
    const nextUpdatedAt = normalizeTimestamp(args.updatedAt, now);

    const patch = {
      clerkOrgId: args.clerkOrgId,
      name: valueOrUndefined(args.name),
      slug: valueOrUndefined(args.slug),
      imageUrl: valueOrUndefined(args.imageUrl),
      status: valueOrUndefined(args.status) ?? "active",
      createdAt: nextCreatedAt,
      updatedAt: nextUpdatedAt,
      lastSyncedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return ctx.db.insert("organizations", patch);
  },
});

export const upsertOrganizationMembership = mutation({
  args: {
    clerkMembershipId: v.string(),
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_clerkMembershipId", (q) => q.eq("clerkMembershipId", args.clerkMembershipId))
      .first();

    const nextCreatedAt = normalizeTimestamp(args.createdAt, existing?.createdAt ?? now);
    const nextUpdatedAt = normalizeTimestamp(args.updatedAt, now);

    const patch = {
      clerkMembershipId: args.clerkMembershipId,
      clerkOrgId: args.clerkOrgId,
      clerkUserId: args.clerkUserId,
      role: valueOrUndefined(args.role),
      status: valueOrUndefined(args.status) ?? "active",
      createdAt: nextCreatedAt,
      updatedAt: nextUpdatedAt,
      lastSyncedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return ctx.db.insert("organizationMemberships", patch);
  },
});

export const markUserDeleted = mutation({
  args: {
    clerkUserId: v.string(),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!existing) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(existing._id, {
      status: "deleted",
      updatedAt: normalizeTimestamp(args.updatedAt, now),
      lastSyncedAt: now,
    });

    return existing._id;
  },
});

export const markOrganizationDeleted = mutation({
  args: {
    clerkOrgId: v.string(),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!existing) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(existing._id, {
      status: "deleted",
      updatedAt: normalizeTimestamp(args.updatedAt, now),
      lastSyncedAt: now,
    });

    return existing._id;
  },
});

export const markOrganizationMembershipDeleted = mutation({
  args: {
    clerkMembershipId: v.string(),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_clerkMembershipId", (q) => q.eq("clerkMembershipId", args.clerkMembershipId))
      .first();

    if (!existing) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(existing._id, {
      status: "deleted",
      updatedAt: normalizeTimestamp(args.updatedAt, now),
      lastSyncedAt: now,
    });

    return existing._id;
  },
});
