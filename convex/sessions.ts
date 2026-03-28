import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { buildAssignedSessionStartUpdate } from "../src/lib/assigned-session-start";
import { canDeleteSessionFiles } from "../src/lib/session-file-access";
import { getTrainingSessionEvaluationBySessionKeyInContext } from "./trainingSessionEvaluations";

export const createTrainingSession = mutation({
  args: {
    orgId: v.string(),
    trainerId: v.string(),
    traineeId: v.optional(v.string()),
    traineeClerkUserId: v.optional(v.string()),
    assistantId: v.string(),
    difficulty: v.string(),
    objectionsRequired: v.number(),
    rebuttalKeys: v.array(v.string()),
    selectedObjections: v.optional(
      v.array(
        v.object({
          order: v.number(),
          text: v.string(),
          rebuttalType: v.string(),
        }),
      ),
    ),
    rebuttalGuideMap: v.optional(v.record(v.string(), v.string())),
    channel: v.literal("web"),
    identityMode: v.optional(v.union(v.literal("ip_match"), v.literal("backup_code"), v.literal("manual_override"))),
    ipHash: v.optional(v.string()),
    initialStatus: v.optional(v.union(v.literal("assigned"), v.literal("started"))),
    profileSnapshot: v.optional(
      v.object({
        difficultyLevel: v.string(),
        objectionsRequired: v.number(),
        expectedRebuttals: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const sessionKey = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    await ctx.db.insert("trainingSessions", {
      sessionKey,
      orgId: args.orgId,
      trainerId: args.trainerId,
      traineeId: args.traineeId,
      traineeClerkUserId: args.traineeClerkUserId,
      assistantId: args.assistantId,
      difficulty: args.difficulty,
      objectionsRequired: args.objectionsRequired,
      rebuttalKeys: args.rebuttalKeys,
      selectedObjections: args.selectedObjections,
      rebuttalGuideMap: args.rebuttalGuideMap,
      channel: args.channel,
      identityMode: args.identityMode,
      ipHash: args.ipHash,
      profileSnapshot: args.profileSnapshot,
      status: args.initialStatus ?? "started",
      createdAt: Date.now(),
      startedAt: args.initialStatus === "assigned" ? undefined : Date.now(),
      updatedAt: Date.now(),
    });

    return { sessionKey };
  },
});

export const reserveTrialSession = mutation({
  args: {
    emailHash: v.string(),
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trialSessions")
      .withIndex("by_emailHash_createdAt", (q) => q.eq("emailHash", args.emailHash))
      .take(3);

    if (existing.length >= 3) {
      return { allowed: false, remaining: 0 };
    }

    await ctx.db.insert("trialSessions", {
      emailHash: args.emailHash,
      sessionKey: args.sessionKey,
      source: "web_trial",
      createdAt: Date.now(),
    });

    return { allowed: true, remaining: 3 - (existing.length + 1) };
  },
});

export const upsertDemoProspect = mutation({
  args: {
    clerkUserId: v.string(),
    orgId: v.string(),
    email: v.string(),
    name: v.string(),
    organizationName: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("demoProspects")
      .withIndex("by_org_user", (q) => q.eq("orgId", args.orgId).eq("clerkUserId", args.clerkUserId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        organizationName: args.organizationName,
        updatedAt: now,
      });

      return {
        demoProspectId: existing._id,
        created: false,
        demoCount: existing.demoCount,
        demoLimit: existing.demoLimit,
      };
    }

    const demoProspectId = await ctx.db.insert("demoProspects", {
      clerkUserId: args.clerkUserId,
      orgId: args.orgId,
      email: args.email,
      name: args.name,
      organizationName: args.organizationName,
      status: "requested",
      demoCount: 0,
      demoLimit: 2,
      firstRequestedAt: now,
      updatedAt: now,
    });

    return {
      demoProspectId,
      created: true,
      demoCount: 0,
      demoLimit: 2,
    };
  },
});

export const getDemoProspectByUserAndOrg = query({
  args: {
    clerkUserId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const prospect = await ctx.db
      .query("demoProspects")
      .withIndex("by_org_user", (q) => q.eq("orgId", args.orgId).eq("clerkUserId", args.clerkUserId))
      .first();

    if (!prospect) {
      return null;
    }

    return {
      demoProspectId: prospect._id,
      clerkUserId: prospect.clerkUserId,
      orgId: prospect.orgId,
      email: prospect.email,
      name: prospect.name,
      organizationName: prospect.organizationName,
      status: prospect.status,
      demoCount: prospect.demoCount,
      demoLimit: prospect.demoLimit,
      firstRequestedAt: prospect.firstRequestedAt,
      lastDemoStartedAt: prospect.lastDemoStartedAt ?? null,
      convertedAt: prospect.convertedAt ?? null,
    };
  },
});

export const reserveAuthenticatedDemoSession = mutation({
  args: {
    clerkUserId: v.string(),
    orgId: v.string(),
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const prospect = await ctx.db
      .query("demoProspects")
      .withIndex("by_org_user", (q) => q.eq("orgId", args.orgId).eq("clerkUserId", args.clerkUserId))
      .first();

    if (!prospect) {
      return {
        allowed: false,
        remaining: 0,
        sessionKey: args.sessionKey,
        demoCount: 0,
        demoLimit: 0,
      };
    }

    if (prospect.demoCount >= prospect.demoLimit) {
      if (prospect.status !== "demo_limit_reached") {
        await ctx.db.patch(prospect._id, {
          status: "demo_limit_reached",
          updatedAt: Date.now(),
        });
      }

      return {
        allowed: false,
        remaining: 0,
        sessionKey: args.sessionKey,
        demoCount: prospect.demoCount,
        demoLimit: prospect.demoLimit,
      };
    }

    const now = Date.now();
    const nextDemoCount = prospect.demoCount + 1;
    const remaining = Math.max(prospect.demoLimit - nextDemoCount, 0);

    await ctx.db.insert("trialSessions", {
      clerkUserId: args.clerkUserId,
      orgId: args.orgId,
      emailHash: `${args.orgId}:${args.clerkUserId}`,
      sessionKey: args.sessionKey,
      source: "web_trial",
      createdAt: now,
    });

    await ctx.db.patch(prospect._id, {
      demoCount: nextDemoCount,
      lastDemoStartedAt: now,
      status: remaining === 0 ? "demo_limit_reached" : "active_demo",
      updatedAt: now,
    });

    return {
      allowed: true,
      remaining,
      sessionKey: args.sessionKey,
      demoCount: nextDemoCount,
      demoLimit: prospect.demoLimit,
    };
  },
});

export const markAssignedSessionStarted = mutation({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    traineeId: v.id("trainees"),
    traineeClerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trainingSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!session || session.orgId !== args.orgId) {
      throw new Error("Session not found");
    }

    if (session.traineeId !== args.traineeId) {
      throw new Error("Session does not belong to this trainee");
    }

    if (session.traineeClerkUserId && session.traineeClerkUserId !== args.traineeClerkUserId) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const update = buildAssignedSessionStartUpdate(session, args.traineeClerkUserId, now);
    if (update.patch) {
      await ctx.db.patch(session._id, update.patch);
    }

    return {
      sessionKey: session.sessionKey,
      status: update.status,
      startedAt: update.startedAt,
    };
  },
});

export const deleteSessionWithArtifacts = mutation({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    userId: v.string(),
    orgRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trainingSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    if (!canDeleteSessionFiles(session, { userId: args.userId, orgId: args.orgId, orgRole: args.orgRole })) {
      throw new Error("Unauthorized");
    }

    const responses = await ctx.db
      .query("rebuttalResponses")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .collect();

    for (const response of responses) {
      await ctx.db.delete(response._id);
    }

    await ctx.db.delete(session._id);

    return {
      success: true,
      deletedResponses: responses.length,
    };
  },
});

export const markSessionCompletedFromWebhook = internalMutation({
  args: {
    sessionKey: v.string(),
    endedAt: v.optional(v.number()),
    sourceEventType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trainingSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!session) {
      return { found: false as const, updated: false as const };
    }

    const patch: {
      status?: "completed";
      endedAt?: number;
      startedAt?: number;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (session.status !== "completed") {
      patch.status = "completed";
    }

    if (!session.endedAt) {
      patch.endedAt = args.endedAt ?? Date.now();
    }

    if (!session.startedAt) {
      patch.startedAt = session.createdAt;
    }

    await ctx.db.patch(session._id, patch);

    return {
      found: true as const,
      updated: true as const,
      sourceEventType: args.sourceEventType ?? null,
    };
  },
});

export const markSessionCompleted = mutation({
  args: {
    sessionKey: v.string(),
    endedAt: v.optional(v.number()),
    sourceEventType: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    finalScore: v.optional(v.number()),
    toneStrikeCount: v.optional(v.number()),
    appointmentSet: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trainingSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    const now = Date.now();
    await ctx.db.patch(session._id, {
      status: "completed",
      startedAt: session.startedAt ?? session.createdAt,
      endedAt: args.endedAt ?? now,
      updatedAt: now,
    });

    if (
      args.durationSeconds !== undefined ||
      args.finalScore !== undefined ||
      args.toneStrikeCount !== undefined ||
      args.appointmentSet !== undefined
    ) {
      await ctx.db.insert("sessionMetrics", {
        sessionKey: session.sessionKey,
        orgId: session.orgId,
        eventType: args.sourceEventType ?? "manual.end",
        durationSeconds: args.durationSeconds,
        toneStrikeCount: args.toneStrikeCount,
        rebuttalScore: args.finalScore,
        appointmentSet: args.appointmentSet,
        rawPayload: {
          source: "api/sessions/[sessionKey]/end",
          sourceEventType: args.sourceEventType ?? null,
        },
        createdAt: now,
      });
    }

    return {
      success: true,
      sessionKey: session.sessionKey,
      orgId: session.orgId,
      status: "completed" as const,
      endedAt: args.endedAt ?? now,
    };
  },
});

export const recordRebuttalScore = mutation({
  args: {
    sessionKey: v.string(),
    objectionId: v.optional(v.string()),
    rebuttalTypeExpected: v.optional(v.string()),
    agentResponse: v.string(),
    toneAnalysis: v.optional(v.string()),
    score: v.number(),
    grade: v.string(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trainingSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    const responseId = await ctx.db.insert("rebuttalResponses", {
      sessionKey: session.sessionKey,
      orgId: session.orgId,
      traineeId: session.traineeId,
      objectionId: args.objectionId,
      rebuttalTypeExpected: args.rebuttalTypeExpected,
      agentResponse: args.agentResponse,
      toneAnalysis: args.toneAnalysis,
      score: args.score,
      grade: args.grade,
      feedback: args.feedback,
      createdAt: Date.now(),
    });

    return {
      responseId,
      sessionKey: session.sessionKey,
      orgId: session.orgId,
      traineeId: session.traineeId ?? null,
    };
  },
});

export const getAssignedSessionForTraineeStart = query({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trainingSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!session || session.orgId !== args.orgId) {
      return null;
    }

    const trainee = session.traineeId ? await ctx.db.get(session.traineeId as any) : null;
    if (!trainee || trainee.status === "disabled") {
      return null;
    }

    const linkedClerkUserId = session.traineeClerkUserId ?? trainee.clerkUserId ?? null;
    if (!linkedClerkUserId || linkedClerkUserId !== args.clerkUserId) {
      return null;
    }

    if (session.status === "completed" || session.status === "abandoned") {
      return null;
    }

    return {
      sessionKey: session.sessionKey,
      orgId: session.orgId,
      trainerId: session.trainerId,
      traineeId: trainee._id,
      traineeClerkUserId: linkedClerkUserId,
      traineeName: trainee.name,
      assistantId: session.assistantId,
      difficulty: session.difficulty,
      objectionsRequired: session.objectionsRequired,
      rebuttalKeys: session.rebuttalKeys,
      rebuttalGuideMap: session.rebuttalGuideMap ?? {},
      selectedObjections: session.selectedObjections ?? [],
      status: session.status,
    };
  },
});

export const getTrainerSessionBuilderSnapshot = query({
  args: {
    orgId: v.string(),
    trainerId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_org_createdAt", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(limit * 3);

    const filtered = sessions.filter((session) => session.trainerId === args.trainerId).slice(0, limit);

    return Promise.all(
      filtered.map(async (session) => {
        const trainee = session.traineeId ? await ctx.db.get(session.traineeId as any) : null;
        const recordingUrl = session.recordingStorageId ? await ctx.storage.getUrl(session.recordingStorageId) : null;
        const transcriptUrl = session.transcriptStorageId ? await ctx.storage.getUrl(session.transcriptStorageId) : null;
        const evaluation = await getTrainingSessionEvaluationBySessionKeyInContext(ctx, {
          sessionKey: session.sessionKey,
        });

        return {
          sessionKey: session.sessionKey,
          traineeId: session.traineeId ?? null,
          traineeName: trainee?.name ?? "Unassigned trainee",
          difficulty: session.difficulty,
          objectionsRequired: session.objectionsRequired,
          selectedObjections: session.selectedObjections ?? [],
          status: session.status,
          createdAt: session.createdAt,
          startedAt: session.startedAt ?? null,
          endedAt: session.endedAt ?? null,
          structuredOutcome: session.structuredOutcome ?? null,
          recordingUrl,
          transcriptUrl,
          evaluation,
        };
      }),
    );
  },
});

export const recoverTrainingSession = mutation({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    trainerId: v.string(),
    action: v.union(v.literal("mark_missed"), v.literal("mark_failed"), v.literal("create_replacement")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trainingSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!session || session.orgId !== args.orgId || session.trainerId !== args.trainerId) {
      throw new Error("Session not found.");
    }

    const now = Date.now();
    const trainee = session.traineeId ? await ctx.db.get(session.traineeId as any) : null;
    const baseContext = {
      orgId: session.orgId,
      trainerId: session.trainerId,
      traineeId: session.traineeId ?? null,
      sessionKey: session.sessionKey,
      statusBefore: session.status,
    };

    if (args.action === "mark_missed" || args.action === "mark_failed") {
      if (session.status === "completed") {
        throw new Error("Completed sessions cannot be reclassified.");
      }

      if (session.status === "abandoned") {
        return {
          action: args.action,
          sessionKey: session.sessionKey,
          status: session.status,
          replacementSessionKey: null,
          message: "This session has already been flagged for follow-up.",
        };
      }

      const reason = args.action === "mark_missed" ? "trainer_marked_missed" : "trainer_marked_failed";
      const message =
        args.action === "mark_missed"
          ? "Trainer marked a session as missed."
          : "Trainer marked a session as failed and needing follow-up.";

      await ctx.db.patch(session._id, {
        status: "abandoned",
        endedAt: session.endedAt ?? now,
        updatedAt: now,
      });

      await ctx.db.insert("alertEvents", {
        source: "sessions:recoverTrainingSession",
        severity: "warning",
        message,
        context: {
          ...baseContext,
          statusAfter: "abandoned",
          reason,
        },
        createdAt: now,
      });

      return {
        action: args.action,
        sessionKey: session.sessionKey,
        status: "abandoned" as const,
        replacementSessionKey: null,
        message:
          args.action === "mark_missed"
            ? "Session marked as missed."
            : "Session marked as failed and logged for follow-up.",
      };
    }

    if (!session.traineeId || !trainee || trainee.status === "disabled") {
      throw new Error("This session no longer has an active trainee.");
    }

    const traineeClerkUserId = session.traineeClerkUserId ?? trainee.clerkUserId ?? null;
    if (!traineeClerkUserId) {
      throw new Error("Ask the trainee to open their dashboard once before sending a replacement session.");
    }

    const traineeSessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_trainee_createdAt", (q) => q.eq("traineeId", session.traineeId as any))
      .collect();
    const existingReplacement = traineeSessions.find(
      (candidate) =>
        candidate.orgId === session.orgId &&
        candidate.trainerId === session.trainerId &&
        candidate.replacementForSessionKey === session.sessionKey,
    );

    if (existingReplacement) {
      return {
        action: args.action,
        sessionKey: session.sessionKey,
        status: session.status === "completed" ? "completed" : ("abandoned" as const),
        replacementSessionKey: existingReplacement.sessionKey,
        message: `Replacement session ${existingReplacement.sessionKey} is already ready for ${trainee.name}.`,
      };
    }

    const replacementSessionKey = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    await ctx.db.insert("trainingSessions", {
      sessionKey: replacementSessionKey,
      orgId: session.orgId,
      trainerId: session.trainerId,
      traineeId: session.traineeId,
      traineeClerkUserId,
      assistantId: session.assistantId,
      difficulty: session.difficulty,
      objectionsRequired: session.objectionsRequired,
      rebuttalKeys: session.rebuttalKeys,
      selectedObjections: session.selectedObjections,
      replacementForSessionKey: session.sessionKey,
      rebuttalGuideMap: session.rebuttalGuideMap,
      channel: session.channel,
      identityMode: session.identityMode,
      ipHash: session.ipHash,
      profileSnapshot:
        session.profileSnapshot ?? {
          difficultyLevel: session.difficulty,
          objectionsRequired: session.objectionsRequired,
          expectedRebuttals: session.rebuttalKeys,
        },
      status: "assigned",
      createdAt: now,
      updatedAt: now,
    });

    if (session.status !== "completed" && session.status !== "abandoned") {
      await ctx.db.patch(session._id, {
        status: "abandoned",
        endedAt: session.endedAt ?? now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("alertEvents", {
      source: "sessions:recoverTrainingSession",
      severity: "warning",
      message: "Trainer created a replacement session after a missed or failed attempt.",
      context: {
        ...baseContext,
        statusAfter: session.status === "completed" ? "completed" : "abandoned",
        reason: "replacement_session_created",
        replacementSessionKey,
      },
      createdAt: now,
    });

    return {
      action: args.action,
      sessionKey: session.sessionKey,
      status: session.status === "completed" ? "completed" : ("abandoned" as const),
      replacementSessionKey,
      message: `Replacement session ${replacementSessionKey} is ready for ${trainee.name}.`,
    };
  },
});

export const getTrainerDashboardSnapshot = query({
  args: { orgId: v.string(), trainerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const trainees = await ctx.db
      .query("trainees")
      .withIndex("by_org_createdAt", (q) => q.eq("orgId", args.orgId))
      .collect();

    const activeTrainees = trainees.filter((trainee) => trainee.status !== "disabled");
    const allSessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_org_createdAt", (q) => q.eq("orgId", args.orgId))
      .collect();

    const sessions = args.trainerId ? allSessions.filter((session) => session.trainerId === args.trainerId) : allSessions;
    const performanceSessions = sessions.filter((session) => session.status !== "assigned");
    const sessionKeySet = new Set(performanceSessions.map((session) => session.sessionKey));

    const allMetrics = await ctx.db
      .query("sessionMetrics")
      .withIndex("by_org_createdAt", (q) => q.eq("orgId", args.orgId))
      .collect();

    const latestMetricsBySession = new Map<
      string,
      {
        createdAt: number;
        rebuttalScore?: number;
        toneStrikeCount?: number;
        appointmentSet?: boolean;
      }
    >();
    for (const metric of allMetrics) {
      if (!sessionKeySet.has(metric.sessionKey)) {
        continue;
      }

      const current = latestMetricsBySession.get(metric.sessionKey);
      if (!current || metric.createdAt > current.createdAt) {
        latestMetricsBySession.set(metric.sessionKey, {
          createdAt: metric.createdAt,
          rebuttalScore: metric.rebuttalScore,
          toneStrikeCount: metric.toneStrikeCount,
          appointmentSet: metric.appointmentSet,
        });
      }
    }

    const allResponses = await ctx.db
      .query("rebuttalResponses")
      .withIndex("by_org_createdAt", (q) => q.eq("orgId", args.orgId))
      .collect();

    const responses = allResponses.filter((response) => sessionKeySet.has(response.sessionKey));

    const completedSessions = performanceSessions.filter((session) => session.status === "completed");
    const latestMetricRows = Array.from(latestMetricsBySession.values());
    const scores = latestMetricRows
      .map((metric) => metric.rebuttalScore)
      .filter((score): score is number => typeof score === "number");
    const hardStopCount = latestMetricRows.filter((metric) => (metric.toneStrikeCount ?? 0) > 0).length;

    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((runningTotal, score) => runningTotal + score, 0) / scores.length) : 0;
    const hardStopRate =
      completedSessions.length > 0 ? Math.round((hardStopCount / completedSessions.length) * 100) : 0;
    const atD3Plus = activeTrainees.filter((trainee) => Number(trainee.difficultyLevel.slice(1)) >= 3).length;

    const traineeRows = activeTrainees.map((trainee) => {
      const traineeSessions = sessions
        .filter((session) => session.traineeId === trainee._id)
        .filter((session) => session.status !== "assigned")
        .sort((a, b) => b.createdAt - a.createdAt);

      const traineeSessionKeys = new Set(traineeSessions.map((session) => session.sessionKey));
      const traineeMetrics = traineeSessions
        .map((session) => latestMetricsBySession.get(session.sessionKey))
        .filter((metric): metric is NonNullable<typeof metric> => Boolean(metric));
      const traineeScores = traineeMetrics
        .map((metric) => metric.rebuttalScore)
        .filter((score): score is number => typeof score === "number");
      const traineeResponses = responses.filter((response) => traineeSessionKeys.has(response.sessionKey));
      const responseScores = traineeResponses.map((response) => response.score);
      const traineeHardStops = traineeMetrics.filter((metric) => (metric.toneStrikeCount ?? 0) > 0).length;
      const appointmentSetCount = traineeMetrics.filter((metric) => metric.appointmentSet === true).length;

      const latestSession = traineeSessions[0] ?? null;
      const latestMetric = latestSession ? latestMetricsBySession.get(latestSession.sessionKey) : null;
      const avgTraineeScore =
        traineeScores.length > 0
          ? Math.round(traineeScores.reduce((runningTotal, score) => runningTotal + score, 0) / traineeScores.length)
          : 0;
      const objectionSuccessRate =
        responseScores.length > 0
          ? Math.round(responseScores.reduce((runningTotal, score) => runningTotal + score, 0) / responseScores.length)
          : avgTraineeScore;
      const hardStopRateForTrainee =
        traineeSessions.length > 0 ? Math.round((traineeHardStops / traineeSessions.length) * 100) : 0;
      const appointmentSetRate =
        traineeSessions.length > 0 ? Math.round((appointmentSetCount / traineeSessions.length) * 100) : 0;

      const recommendation =
        traineeSessions.length === 0
          ? "Run first training call"
          : avgTraineeScore >= 85 && hardStopRateForTrainee <= 5
            ? "Ready for higher difficulty"
            : hardStopRateForTrainee > 10
              ? "Coach tone and pacing"
              : "Increase objection reps";
      const focusArea =
        traineeSessions.length === 0
          ? "Start with D2 objection drills"
          : objectionSuccessRate < 75
            ? "Objection handling quality"
            : hardStopRateForTrainee > 10
              ? "Tone and compliance control"
              : "Consistency under pressure";

      return {
        id: trainee._id,
        name: trainee.name,
        email: trainee.email,
        level: trainee.difficultyLevel,
        avgScore: avgTraineeScore,
        callsThisLevel: traineeSessions.length,
        hardStops: traineeHardStops,
        hardStopRate: hardStopRateForTrainee,
        objectionSuccessRate,
        appointmentSetRate,
        recommendation,
        focusArea,
        status: trainee.status,
        latestScore: latestMetric?.rebuttalScore ?? null,
        latestSessionStatus: latestSession?.status ?? null,
        latestSessionAt: latestSession?.startedAt ?? latestSession?.createdAt ?? null,
      };
    });

    return {
      hasData: activeTrainees.length > 0,
      totalAgents: activeTrainees.length,
      avgScore,
      atD3Plus,
      hardStopRate,
      trainees: traineeRows.sort((a, b) => {
        const aTime = a.latestSessionAt ?? 0;
        const bTime = b.latestSessionAt ?? 0;
        if (bTime !== aTime) {
          return bTime - aTime;
        }
        return b.avgScore - a.avgScore;
      }),
    };
  },
});
