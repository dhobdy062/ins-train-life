import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

export const reconcileStripeCustomerBilling = mutation({
  args: {
    stripeCustomerId: v.string(),
    orgId: v.string(),
    reassignBillingEvents: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const shouldReassign = args.reassignBillingEvents ?? true;

    const existingMap = await ctx.db
      .query("stripeCustomerOrgMap")
      .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .first();

    if (!existingMap) {
      await ctx.db.insert("stripeCustomerOrgMap", {
        stripeCustomerId: args.stripeCustomerId,
        orgId: args.orgId,
        firstSeenAt: now,
        lastSeenAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existingMap._id, {
        orgId: args.orgId,
        lastSeenAt: now,
        updatedAt: now,
      });
    }

    let scannedBillingEvents = 0;
    let reassignedBillingEvents = 0;

    if (shouldReassign) {
      const customerEvents = await ctx.db
        .query("billingEvents")
        .withIndex("by_stripeCustomerId_createdAt", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
        .collect();

      scannedBillingEvents = customerEvents.length;

      for (const event of customerEvents) {
        if (event.orgId === args.orgId) {
          continue;
        }

        await ctx.db.patch(event._id, {
          orgId: args.orgId,
        });
        reassignedBillingEvents += 1;
      }
    }

    return {
      stripeCustomerId: args.stripeCustomerId,
      orgId: args.orgId,
      mappingUpdated: true,
      previousOrgId: existingMap?.orgId ?? null,
      scannedBillingEvents,
      reassignedBillingEvents,
      reassignBillingEvents: shouldReassign,
      reconciledAt: now,
    };
  },
});
