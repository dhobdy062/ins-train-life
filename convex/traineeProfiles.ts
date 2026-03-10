import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const createTraineeProfile = mutation({
  args: {
    orgId: v.string(),
    trainerId: v.string(),
    clerkUserId: v.optional(v.string()),
    clerkMembershipId: v.optional(v.string()),
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
        clerkUserId: args.clerkUserId,
        clerkMembershipId: args.clerkMembershipId,
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
      clerkUserId: args.clerkUserId,
      clerkMembershipId: args.clerkMembershipId,
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
      clerkUserId: trainee.clerkUserId ?? null,
      clerkMembershipId: trainee.clerkMembershipId ?? null,
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

export const getTraineeByOrgAndEmail = query({
  args: {
    orgId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const trainee = await ctx.db
      .query("trainees")
      .withIndex("by_org_email", (q) => q.eq("orgId", args.orgId).eq("email", normalizeEmail(args.email)))
      .first();

    if (!trainee || trainee.status === "disabled") {
      return null;
    }

    return {
      traineeId: trainee._id,
      orgId: trainee.orgId,
      trainerId: trainee.trainerId,
      clerkUserId: trainee.clerkUserId ?? null,
      clerkMembershipId: trainee.clerkMembershipId ?? null,
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

export const getTraineeByClerkUserId = query({
  args: {
    orgId: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const trainee = await ctx.db
      .query("trainees")
      .withIndex("by_org_clerkUserId", (q) => q.eq("orgId", args.orgId).eq("clerkUserId", args.clerkUserId))
      .first();

    if (!trainee || trainee.status === "disabled") {
      return null;
    }

    return {
      traineeId: trainee._id,
      orgId: trainee.orgId,
      trainerId: trainee.trainerId,
      clerkUserId: trainee.clerkUserId ?? null,
      clerkMembershipId: trainee.clerkMembershipId ?? null,
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

export const getTraineeProfileById = query({
  args: {
    traineeId: v.id("trainees"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const trainee = await ctx.db.get(args.traineeId);
    if (!trainee || trainee.orgId !== args.orgId || trainee.status === "disabled") {
      return null;
    }

    return {
      traineeId: trainee._id,
      orgId: trainee.orgId,
      trainerId: trainee.trainerId,
      clerkUserId: trainee.clerkUserId ?? null,
      clerkMembershipId: trainee.clerkMembershipId ?? null,
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

    const enriched = await Promise.all(
      trainees.map(async (trainee) => {
        const ipLink = await ctx.db
          .query("traineeSessionIps")
          .withIndex("by_org_trainee", (q) => q.eq("orgId", args.orgId).eq("traineeId", trainee._id))
          .first();

        return {
          traineeId: trainee._id,
          clerkUserId: trainee.clerkUserId ?? null,
          clerkMembershipId: trainee.clerkMembershipId ?? null,
          name: trainee.name,
          email: trainee.email,
          difficultyLevel: trainee.difficultyLevel,
          numObjections: trainee.numObjections,
          expectedRebuttals: trainee.expectedRebuttals,
          status: trainee.status,
          updatedAt: trainee.updatedAt,
          lastActiveAt: trainee.lastActiveAt ?? null,
          ipAddressMasked: ipLink?.ipAddressMasked ?? null,
          ipConsentedAt: ipLink?.consentedAt ?? null,
        };
      }),
    );

    return enriched;
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
      clerkUserId: trainee.clerkUserId ?? null,
      clerkMembershipId: trainee.clerkMembershipId ?? null,
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
      clerkUserId: trainee.clerkUserId ?? null,
      clerkMembershipId: trainee.clerkMembershipId ?? null,
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

export const disableTraineeProfile = mutation({
  args: {
    traineeId: v.id("trainees"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const trainee = await ctx.db.get(args.traineeId);
    if (!trainee || trainee.orgId !== args.orgId) {
      throw new Error("Trainee not found");
    }

    const now = Date.now();
    if (trainee.status !== "disabled") {
      await ctx.db.patch(trainee._id, {
        status: "disabled",
        updatedAt: now,
      });
    }

    return {
      traineeId: trainee._id,
      status: "disabled" as const,
      updatedAt: now,
      alreadyDisabled: trainee.status === "disabled",
    };
  },
});

export const linkTraineeIdentity = mutation({
  args: {
    traineeId: v.id("trainees"),
    orgId: v.string(),
    clerkUserId: v.string(),
    clerkMembershipId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trainee = await ctx.db.get(args.traineeId);
    if (!trainee || trainee.orgId !== args.orgId) {
      throw new Error("Trainee not found");
    }

    const now = Date.now();
    const nextStatus = trainee.status === "disabled" ? "disabled" : "active";

    await ctx.db.patch(trainee._id, {
      clerkUserId: args.clerkUserId,
      clerkMembershipId: args.clerkMembershipId ?? trainee.clerkMembershipId,
      status: nextStatus,
      lastActiveAt: now,
      updatedAt: now,
    });

    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_trainee_createdAt", (q) => q.eq("traineeId", args.traineeId))
      .collect();

    let repairedSessionCount = 0;
    for (const session of sessions) {
      if (session.orgId !== args.orgId) {
        continue;
      }

      if (session.status === "completed" || session.status === "abandoned") {
        continue;
      }

      if (session.traineeClerkUserId === args.clerkUserId) {
        continue;
      }

      await ctx.db.patch(session._id, {
        traineeClerkUserId: args.clerkUserId,
        updatedAt: now,
      });
      repairedSessionCount += 1;
    }

    return {
      traineeId: trainee._id,
      clerkUserId: args.clerkUserId,
      clerkMembershipId: args.clerkMembershipId ?? trainee.clerkMembershipId ?? null,
      status: nextStatus,
      repairedSessionCount,
      updatedAt: now,
    };
  },
});

export const getTraineeResultsSnapshot = query({
  args: {
    traineeId: v.id("trainees"),
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trainee = await ctx.db.get(args.traineeId);
    if (!trainee || trainee.orgId !== args.orgId || trainee.status === "disabled") {
      return null;
    }

    const limit = Math.min(Math.max(args.limit ?? 10, 1), 25);
    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_trainee_createdAt", (q) => q.eq("traineeId", args.traineeId))
      .order("desc")
      .take(limit * 3);

    const metricsBySession = new Map<
      string,
      {
        rebuttalScore: number | null;
        durationSeconds: number | null;
        toneStrikeCount: number | null;
        appointmentSet: boolean | null;
        eventType: string | null;
        createdAt: number;
      } | null
    >();

    for (const session of sessions) {
      const sessionMetrics = await ctx.db
        .query("sessionMetrics")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", session.sessionKey))
        .collect();

      const latestMetric = sessionMetrics.sort((a, b) => b.createdAt - a.createdAt)[0];
      metricsBySession.set(
        session.sessionKey,
        latestMetric
          ? {
              rebuttalScore: latestMetric.rebuttalScore ?? null,
              durationSeconds: latestMetric.durationSeconds ?? null,
              toneStrikeCount: latestMetric.toneStrikeCount ?? null,
              appointmentSet: latestMetric.appointmentSet ?? null,
              eventType: latestMetric.eventType ?? null,
              createdAt: latestMetric.createdAt,
            }
          : null,
      );
    }

    const resultSessions = sessions.filter((session) => session.status !== "assigned").slice(0, limit);
    const latestSession = resultSessions[0] ?? null;
    const assignedSessions = sessions
      .filter((session) => session.status === "assigned")
      .slice(0, limit)
      .map((session) => ({
        sessionKey: session.sessionKey,
        status: session.status,
        difficulty: session.difficulty,
        objectionsRequired: session.objectionsRequired,
        createdAt: session.createdAt,
        startedAt: session.startedAt ?? null,
        selectedObjections: session.selectedObjections ?? [],
      }));
    let latestRebuttals: Array<{
      objectionId: string | null;
      rebuttalTypeExpected: string | null;
      response: string;
      toneAnalysis: string | null;
      score: number;
      grade: string;
      feedback: string | null;
      createdAt: number;
    }> = [];

    if (latestSession) {
      const rebuttalRows = await ctx.db
        .query("rebuttalResponses")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", latestSession.sessionKey))
        .collect();

      // Ordered oldest-to-newest so trainees can follow rebuttals in call sequence.
      latestRebuttals = rebuttalRows
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((row) => ({
          objectionId: row.objectionId ?? null,
          rebuttalTypeExpected: row.rebuttalTypeExpected ?? null,
          response: row.agentResponse,
          toneAnalysis: row.toneAnalysis ?? null,
          score: row.score,
          grade: row.grade,
          feedback: row.feedback ?? null,
          createdAt: row.createdAt,
        }));
    }

    const latestSessionInfo = latestSession
      ? {
          sessionKey: latestSession.sessionKey,
          status: latestSession.status,
          assistantId: latestSession.assistantId,
          difficulty: latestSession.difficulty,
          objectionsRequired: latestSession.objectionsRequired,
          startedAt: latestSession.startedAt ?? latestSession.createdAt,
          endedAt: latestSession.endedAt ?? null,
          structuredOutcome: latestSession.structuredOutcome ?? null,
          recordingUrl: latestSession.recordingStorageId
            ? await ctx.storage.getUrl(latestSession.recordingStorageId)
            : null,
          transcriptUrl: latestSession.transcriptStorageId
            ? await ctx.storage.getUrl(latestSession.transcriptStorageId)
            : null,
        }
      : null;

    const history = await Promise.all(
      resultSessions.map(async (session) => ({
        sessionKey: session.sessionKey,
        status: session.status,
        assistantId: session.assistantId,
        difficulty: session.difficulty,
        objectionsRequired: session.objectionsRequired,
        startedAt: session.startedAt ?? session.createdAt,
        endedAt: session.endedAt ?? null,
        selectedObjections: session.selectedObjections ?? [],
        structuredOutcome: session.structuredOutcome ?? null,
        recordingUrl: session.recordingStorageId ? await ctx.storage.getUrl(session.recordingStorageId) : null,
        transcriptUrl: session.transcriptStorageId ? await ctx.storage.getUrl(session.transcriptStorageId) : null,
        metrics: metricsBySession.get(session.sessionKey) ?? null,
      })),
    );

    return {
      trainee: {
        id: trainee._id,
        name: trainee.name,
        difficulty: trainee.difficultyLevel,
        numObjections: trainee.numObjections,
        status: trainee.status,
      },
      latestSession: latestSessionInfo,
      latestMetrics: latestSession ? metricsBySession.get(latestSession.sessionKey) ?? null : null,
      latestRebuttals,
      assignedSessions,
      history,
    };
  },
});
