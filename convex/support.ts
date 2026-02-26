import { v } from "convex/values";
import { query } from "./_generated/server";

export const checkClerkAndStripeAssociation = query({
  args: {
    clerkUserId: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    const memberships = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();

    const stripeMappings = await ctx.db
      .query("stripeCustomerOrgMap")
      .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .collect();

    const clerkOrgIds = new Set(memberships.map((membership) => membership.clerkOrgId));
    const overlappingOrgIds = stripeMappings
      .map((mapping) => mapping.orgId)
      .filter((orgId) => clerkOrgIds.has(orgId));

    return {
      clerkUserFound: Boolean(user),
      clerkUser: user,
      clerkMemberships: memberships,
      stripeCustomerFound: stripeMappings.length > 0,
      stripeCustomerMappings: stripeMappings,
      associatedWithSameOrg: overlappingOrgIds.length > 0,
      overlappingOrgIds,
    };
  },
});
