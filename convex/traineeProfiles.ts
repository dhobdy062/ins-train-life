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

    const enriched = await Promise.all(
      trainees.map(async (trainee) => {
        const ipLink = await ctx.db
          .query("traineeSessionIps")
          .withIndex("by_org_trainee", (q) => q.eq("orgId", args.orgId).eq("traineeId", trainee._id))
          .first();

        return {
          traineeId: trainee._id,
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
      .take(limit);

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

    const latestSession = sessions[0] ?? null;
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

    return {
      trainee: {
        id: trainee._id,
        name: trainee.name,
        difficulty: trainee.difficultyLevel,
        numObjections: trainee.numObjections,
        status: trainee.status,
      },
      latestSession: latestSession
        ? {
            sessionKey: latestSession.sessionKey,
            status: latestSession.status,
            assistantId: latestSession.assistantId,
            difficulty: latestSession.difficulty,
            objectionsRequired: latestSession.objectionsRequired,
            startedAt: latestSession.createdAt,
            endedAt: latestSession.endedAt ?? null,
          }
        : null,
      latestMetrics: latestSession ? metricsBySession.get(latestSession.sessionKey) ?? null : null,
      latestRebuttals,
      history: sessions.map((session) => ({
        sessionKey: session.sessionKey,
        status: session.status,
        assistantId: session.assistantId,
        difficulty: session.difficulty,
        objectionsRequired: session.objectionsRequired,
        startedAt: session.createdAt,
        endedAt: session.endedAt ?? null,
        metrics: metricsBySession.get(session.sessionKey) ?? null,
      })),
    };
  },
});
