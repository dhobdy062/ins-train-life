import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createTrainingSession = mutation({
  args: {
    orgId: v.string(),
    trainerId: v.string(),
    traineeId: v.optional(v.string()),
    assistantId: v.string(),
    difficulty: v.string(),
    objectionsRequired: v.number(),
    rebuttalKeys: v.array(v.string()),
    channel: v.literal("web"),
    identityMode: v.optional(v.union(v.literal("ip_match"), v.literal("backup_code"), v.literal("manual_override"))),
    ipHash: v.optional(v.string()),
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
      assistantId: args.assistantId,
      difficulty: args.difficulty,
      objectionsRequired: args.objectionsRequired,
      rebuttalKeys: args.rebuttalKeys,
      channel: args.channel,
      identityMode: args.identityMode,
      ipHash: args.ipHash,
      profileSnapshot: args.profileSnapshot,
      status: "started",
      createdAt: Date.now(),
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

export const deleteSessionWithArtifacts = mutation({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trainingSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    const hasAccess = session.trainerId === args.userId || session.orgId === args.orgId;
    if (!hasAccess) {
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
    const sessionKeySet = new Set(sessions.map((session) => session.sessionKey));

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

    const completedSessions = sessions.filter((session) => session.status === "completed");
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
        latestSessionAt: latestSession?.createdAt ?? null,
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
