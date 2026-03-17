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

export const auditIdentityAndSessionMismatches = query({
  args: {
    orgId: v.optional(v.string()),
    staleAssignedAfterHours: v.optional(v.number()),
    staleStartedAfterHours: v.optional(v.number()),
    sampleLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sampleLimit = Math.min(Math.max(args.sampleLimit ?? 25, 1), 100);
    const staleAssignedAfterMs = Math.max(args.staleAssignedAfterHours ?? 24, 1) * 60 * 60 * 1000;
    const staleStartedAfterMs = Math.max(args.staleStartedAfterHours ?? 2, 1) * 60 * 60 * 1000;

    const [trainees, users, memberships, sessions, alerts, emailEvents] = await Promise.all([
      ctx.db.query("trainees").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("organizationMemberships").collect(),
      ctx.db.query("trainingSessions").collect(),
      ctx.db.query("alertEvents")
        .withIndex("by_createdAt")
        .order("desc")
        .filter((q) =>
          q.or(
            q.eq(q.field("source"), "webhooks.persistVapiEvent"),
            q.eq(q.field("source"), "webhooks.persistWebhookSessionArtifacts"),
            q.eq(q.field("source"), "api/vapi/session/start")
          )
        )
        .take(200),
      args.orgId
        ? ctx.db.query("emailEvents").withIndex("by_org_createdAt", (q) => q.eq("orgId", args.orgId)).order("desc").take(200)
        : ctx.db.query("emailEvents").withIndex("by_createdAt").order("desc").take(200),
    ]);

    const scopedTrainees = args.orgId ? trainees.filter((trainee) => trainee.orgId === args.orgId) : trainees;
    const scopedSessions = args.orgId ? sessions.filter((session) => session.orgId === args.orgId) : sessions;
    const scopedAlerts = args.orgId
      ? alerts.filter((alert) => {
          const contextOrgId = typeof alert.context?.orgId === "string" ? alert.context.orgId : null;
          return contextOrgId === args.orgId;
        })
      : alerts;
    const failedEmailDeliveries = emailEvents.filter((event) => event.status === "failed");

    const usersByEmail = new Map<string, Array<(typeof users)[number]>>();
    for (const user of users) {
      const email = user.primaryEmail?.trim().toLowerCase();
      if (!email) {
        continue;
      }
      const list = usersByEmail.get(email) ?? [];
      list.push(user);
      usersByEmail.set(email, list);
    }

    const activeMembershipKey = new Set(
      memberships
        .filter((membership) => membership.status !== "deleted")
        .map((membership) => `${membership.clerkOrgId}::${membership.clerkUserId}`),
    );

    const traineeById = new Map(scopedTrainees.map((trainee) => [String(trainee._id), trainee]));

    const missingIdentityLink: Array<Record<string, unknown>> = [];
    const missingMembership: Array<Record<string, unknown>> = [];
    const recoverableByEmail: Array<Record<string, unknown>> = [];

    for (const trainee of scopedTrainees) {
      if (!trainee.clerkUserId) {
        missingIdentityLink.push({
          traineeId: trainee._id,
          orgId: trainee.orgId,
          name: trainee.name,
          email: trainee.email,
          status: trainee.status,
          updatedAt: trainee.updatedAt,
        });

        const emailMatches = usersByEmail.get(trainee.email) ?? [];
        if (emailMatches.length > 0) {
          recoverableByEmail.push({
            traineeId: trainee._id,
            orgId: trainee.orgId,
            name: trainee.name,
            email: trainee.email,
            candidateClerkUserIds: emailMatches.map((user) => user.clerkUserId),
          });
        }
        continue;
      }

      if (!activeMembershipKey.has(`${trainee.orgId}::${trainee.clerkUserId}`)) {
        missingMembership.push({
          traineeId: trainee._id,
          orgId: trainee.orgId,
          name: trainee.name,
          email: trainee.email,
          clerkUserId: trainee.clerkUserId,
          clerkMembershipId: trainee.clerkMembershipId ?? null,
        });
      }
    }

    const assignedMissingClerkUser: Array<Record<string, unknown>> = [];
    const assignedIdentityMismatch: Array<Record<string, unknown>> = [];
    const staleAssignedSessions: Array<Record<string, unknown>> = [];
    const staleStartedSessions: Array<Record<string, unknown>> = [];

    for (const session of scopedSessions) {
      const trainee = session.traineeId ? traineeById.get(String(session.traineeId)) ?? null : null;

      if (session.status === "assigned") {
        if (!session.traineeClerkUserId) {
          assignedMissingClerkUser.push({
            sessionKey: session.sessionKey,
            orgId: session.orgId,
            traineeId: session.traineeId ?? null,
            traineeName: trainee?.name ?? null,
            createdAt: session.createdAt,
          });
        }

        if (now - session.createdAt > staleAssignedAfterMs) {
          staleAssignedSessions.push({
            sessionKey: session.sessionKey,
            orgId: session.orgId,
            traineeId: session.traineeId ?? null,
            traineeName: trainee?.name ?? null,
            createdAt: session.createdAt,
            ageHours: Math.round(((now - session.createdAt) / (60 * 60 * 1000)) * 10) / 10,
          });
        }
      }

      if (
        trainee &&
        trainee.clerkUserId &&
        session.traineeClerkUserId &&
        trainee.clerkUserId !== session.traineeClerkUserId &&
        session.status !== "completed" &&
        session.status !== "abandoned"
      ) {
        assignedIdentityMismatch.push({
          sessionKey: session.sessionKey,
          orgId: session.orgId,
          traineeId: trainee._id,
          traineeName: trainee.name,
          sessionClerkUserId: session.traineeClerkUserId,
          traineeClerkUserId: trainee.clerkUserId,
          status: session.status,
        });
      }

      const startedAt = session.startedAt ?? null;
      if (session.status === "started" && startedAt && !session.endedAt && now - startedAt > staleStartedAfterMs) {
        staleStartedSessions.push({
          sessionKey: session.sessionKey,
          orgId: session.orgId,
          traineeId: session.traineeId ?? null,
          traineeName: trainee?.name ?? null,
          startedAt,
          ageHours: Math.round(((now - startedAt) / (60 * 60 * 1000)) * 10) / 10,
        });
      }
    }

    return {
      generatedAt: now,
      scope: {
        orgId: args.orgId ?? null,
        staleAssignedAfterHours: staleAssignedAfterMs / (60 * 60 * 1000),
        staleStartedAfterHours: staleStartedAfterMs / (60 * 60 * 1000),
      },
      counts: {
        traineesReviewed: scopedTrainees.length,
        sessionsReviewed: scopedSessions.length,
        recentAlertsReviewed: scopedAlerts.length,
        failedEmailDeliveries: failedEmailDeliveries.length,
        missingIdentityLink: missingIdentityLink.length,
        missingMembership: missingMembership.length,
        recoverableByEmail: recoverableByEmail.length,
        assignedMissingClerkUser: assignedMissingClerkUser.length,
        assignedIdentityMismatch: assignedIdentityMismatch.length,
        staleAssignedSessions: staleAssignedSessions.length,
        staleStartedSessions: staleStartedSessions.length,
      },
      samples: {
        missingIdentityLink: missingIdentityLink.slice(0, sampleLimit),
        missingMembership: missingMembership.slice(0, sampleLimit),
        recoverableByEmail: recoverableByEmail.slice(0, sampleLimit),
        assignedMissingClerkUser: assignedMissingClerkUser.slice(0, sampleLimit),
        assignedIdentityMismatch: assignedIdentityMismatch.slice(0, sampleLimit),
        staleAssignedSessions: staleAssignedSessions.slice(0, sampleLimit),
        staleStartedSessions: staleStartedSessions.slice(0, sampleLimit),
        failedEmailDeliveries: failedEmailDeliveries.slice(0, sampleLimit).map((event) => ({
          orgId: event.orgId ?? null,
          recipient: event.recipient ?? null,
          sequence: event.sequence ?? null,
          error: event.error ?? null,
          createdAt: event.createdAt,
          metadata: event.metadata ?? null,
        })),
        recentAlerts: scopedAlerts.slice(0, sampleLimit).map((alert) => ({
          source: alert.source,
          severity: alert.severity,
          message: alert.message,
          createdAt: alert.createdAt,
          context: alert.context ?? null,
        })),
      },
    };
  },
});

export const sweepStaleSessions = mutation({
  args: {
    orgId: v.optional(v.string()),
    staleAssignedAfterHours: v.optional(v.number()),
    staleStartedAfterHours: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const staleAssignedAfterMs = Math.max(args.staleAssignedAfterHours ?? 24, 1) * 60 * 60 * 1000;
    const staleStartedAfterMs = Math.max(args.staleStartedAfterHours ?? 2, 1) * 60 * 60 * 1000;
    const dryRun = args.dryRun ?? false;

    const sessions = await ctx.db.query("trainingSessions").collect();
    const scopedSessions = args.orgId ? sessions.filter((session) => session.orgId === args.orgId) : sessions;

    const staleAssigned = scopedSessions.filter(
      (session) => session.status === "assigned" && now - session.createdAt > staleAssignedAfterMs,
    );
    const staleStarted = scopedSessions.filter((session) => {
      const startedAt = session.startedAt ?? null;
      return session.status === "started" && Boolean(startedAt) && !session.endedAt && now - startedAt > staleStartedAfterMs;
    });

    if (!dryRun) {
      for (const session of staleAssigned) {
        await ctx.db.patch(session._id, {
          status: "abandoned",
          endedAt: session.endedAt ?? now,
          updatedAt: now,
        });

        await ctx.db.insert("alertEvents", {
          source: "support:sweepStaleSessions",
          severity: "warning",
          message: "Assigned session expired before the trainee started it.",
          context: {
            orgId: session.orgId,
            sessionKey: session.sessionKey,
            traineeId: session.traineeId ?? null,
            statusBefore: "assigned",
            statusAfter: "abandoned",
            ageHours: Math.round(((now - session.createdAt) / (60 * 60 * 1000)) * 10) / 10,
            reason: "stale_assigned",
          },
          createdAt: now,
        });
      }

      for (const session of staleStarted) {
        const startedAt = session.startedAt ?? session.createdAt;
        await ctx.db.patch(session._id, {
          status: "abandoned",
          endedAt: session.endedAt ?? now,
          updatedAt: now,
        });

        await ctx.db.insert("alertEvents", {
          source: "support:sweepStaleSessions",
          severity: "warning",
          message: "Started session expired without a completion event.",
          context: {
            orgId: session.orgId,
            sessionKey: session.sessionKey,
            traineeId: session.traineeId ?? null,
            statusBefore: "started",
            statusAfter: "abandoned",
            ageHours: Math.round(((now - startedAt) / (60 * 60 * 1000)) * 10) / 10,
            reason: "stale_started",
          },
          createdAt: now,
        });
      }
    }

    return {
      dryRun,
      scopedOrgId: args.orgId ?? null,
      staleAssignedCount: staleAssigned.length,
      staleStartedCount: staleStarted.length,
      updatedCount: dryRun ? 0 : staleAssigned.length + staleStarted.length,
      sample: {
        staleAssigned: staleAssigned.slice(0, 10).map((session) => ({
          sessionKey: session.sessionKey,
          orgId: session.orgId,
          traineeId: session.traineeId ?? null,
          createdAt: session.createdAt,
        })),
        staleStarted: staleStarted.slice(0, 10).map((session) => ({
          sessionKey: session.sessionKey,
          orgId: session.orgId,
          traineeId: session.traineeId ?? null,
          startedAt: session.startedAt ?? session.createdAt,
        })),
      },
    };
  },
});
