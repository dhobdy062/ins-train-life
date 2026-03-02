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
    // 1. Get all members of the organization
    const memberships = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.orgId))
      .collect();

    const userIds = memberships.map((m) => m.clerkUserId);
    
    // 2. Fetch user profiles
    const users = await Promise.all(
      userIds.map(async (clerkUserId) => {
        return ctx.db
          .query("users")
          .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
          .first();
      })
    );

    const activeUsers = users.filter((u) => u !== null && u.status !== "deleted");

    // 3. Fetch recent metadata/sessions for the org
    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_org_createdAt", (q) => q.eq("orgId", args.orgId))
      .collect();

    const metrics = await ctx.db
      .query("sessionMetrics")
      .withIndex("by_org_createdAt", (q) => q.eq("orgId", args.orgId))
      .collect();

    // 4. Calculate aggregate stats
    const totalAgents = activeUsers.length;
    const completedSessions = sessions.filter((s) => s.status === "completed");
    
    const allScores = metrics
      .map((m) => m.rebuttalScore)
      .filter((s): s is number => s !== undefined);
    
    const avgScore = allScores.length > 0 
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

    const atD3Plus = activeUsers.filter((u) => {
      const userSessions = sessions.filter(s => s.traineeId === u?.clerkUserId);
      return userSessions.length >= 15; // Simple heuristic for D3
    }).length;

    const hardStops = metrics.filter(m => m.toneStrikeCount && m.toneStrikeCount > 0).length;
    const hardStopRate = sessions.length > 0 ? Math.round((hardStops / sessions.length) * 100) : 0;

    // 5. Prepare trainee list
    const trainees = await Promise.all(activeUsers.map(async (u) => {
      const userSessions = sessions.filter(s => s.traineeId === u?.clerkUserId);
      const userMetrics = metrics.filter(m => userSessions.some(s => s.sessionKey === m.sessionKey));
      
      const userScores = userMetrics
        .map(m => m.rebuttalScore)
        .filter((s): s is number => s !== undefined);
      
      const userAvgScore = userScores.length > 0
        ? Math.round(userScores.reduce((a, b) => a + b, 0) / userScores.length)
        : 0;

      const userHardStops = userMetrics.filter(m => m.toneStrikeCount && m.toneStrikeCount > 0).length;
      
      return {
        id: u?.clerkUserId || "",
        name: u?.fullName || u?.firstName || "Unknown",
        email: u?.primaryEmail || "",
        level: userSessions.length >= 30 ? "D4" : userSessions.length >= 15 ? "D3" : userSessions.length >= 8 ? "D2" : "D1",
        avgScore: userAvgScore,
        callsThisLevel: userSessions.length,
        hardStops: userHardStops,
        hardStopRate: userSessions.length > 0 ? Math.round((userHardStops / userSessions.length) * 100) : 0,
        objectionSuccessRate: userAvgScore, // Placeholder
        appointmentSetRate: Math.round(userMetrics.filter(m => m.appointmentSet).length / (userSessions.length || 1) * 100),
        recommendation: userAvgScore > 85 ? "Promote to next level" : "Focus on objection handling",
        focusArea: userAvgScore < 70 ? "Tone & Pacing" : "Spouse Decision Objection",
      };
    }));

    return {
      hasData: sessions.length > 0,
      totalAgents,
      avgScore,
      atD3Plus,
      hardStopRate,
      trainees: trainees.sort((a, b) => b.avgScore - a.avgScore),
    };
  },
});
