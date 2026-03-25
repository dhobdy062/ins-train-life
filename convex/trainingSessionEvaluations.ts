import { api } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  evaluateTrainingSessionDataFlow,
  type TrainingSessionEvaluationIssue,
  type TrainingSessionEvaluationStatus,
} from "../src/lib/training-session-evaluation";

const AUTOMATIC_EVALUATION_GRACE_WINDOW_MS = 5 * 60 * 1000;

type PersistedTrainingSessionEvaluation = {
  sessionKey: string;
  orgId: string;
  trainerId: string;
  traineeId: string | null;
  status: TrainingSessionEvaluationStatus;
  source: "automatic" | "manual";
  issues: TrainingSessionEvaluationIssue[];
  summary: string;
  attemptCount: number;
  lastCompletedAt: number | null;
  evaluatedAt: number;
};

export const upsertAutomaticEvaluationForSession = internalMutation({
  args: {
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    return upsertAutomaticEvaluationForSessionInContext(ctx, args);
  },
});

export const getTrainingSessionEvaluationBySessionKey = query({
  args: {
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db
      .query("trainingSessionEvaluations")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!evaluation) {
      return null;
    }

    return {
      evaluationId: evaluation._id,
      sessionKey: evaluation.sessionKey,
      orgId: evaluation.orgId,
      trainerId: evaluation.trainerId,
      traineeId: evaluation.traineeId ?? null,
      status: evaluation.status,
      source: evaluation.source,
      issues: evaluation.issues,
      summary: evaluation.summary,
      attemptCount: evaluation.attemptCount,
      lastCompletedAt: evaluation.lastCompletedAt ?? null,
      evaluatedAt: evaluation.evaluatedAt,
      createdAt: evaluation.createdAt,
      updatedAt: evaluation.updatedAt,
    };
  },
});

export async function upsertAutomaticEvaluationForSessionInContext(
  ctx: any,
  args: {
    sessionKey: string;
  },
) {
  const session = await ctx.db
    .query("trainingSessions")
    .withIndex("by_sessionKey", (q: any) => q.eq("sessionKey", args.sessionKey))
    .first();

  if (!session) {
    return { found: false as const, evaluationId: null };
  }

  const latestMetric = await ctx.db
    .query("sessionMetrics")
    .withIndex("by_sessionKey", (q: any) => q.eq("sessionKey", args.sessionKey))
    .order("desc")
    .first();

  const trainerSnapshot = await ctx.runQuery(api.sessions.getTrainerSessionBuilderSnapshot, {
    orgId: session.orgId,
    trainerId: session.trainerId,
    limit: 50,
  });

  const trainerSnapshotIncludesSession = trainerSnapshot.some(
    (snapshotSession: { sessionKey: string }) => snapshotSession.sessionKey === session.sessionKey,
  );

  const traineeSnapshotIncludesSession = session.traineeId
    ? await traineeSnapshotHasSession(ctx, {
        orgId: session.orgId,
        traineeId: session.traineeId,
        sessionKey: session.sessionKey,
      })
    : false;

  const evaluatedAt = Date.now();
  const result = evaluateTrainingSessionDataFlow({
    now: evaluatedAt,
    graceWindowMs: AUTOMATIC_EVALUATION_GRACE_WINDOW_MS,
    session: {
      sessionKey: session.sessionKey,
      orgId: session.orgId,
      trainerId: session.trainerId,
      traineeId: session.traineeId ?? null,
      status: session.status,
      endedAt: session.endedAt ?? null,
      structuredOutcomeExpected: true,
      structuredOutcomePresent: Boolean(session.structuredOutcome),
      recordingPresent: Boolean(session.recordingStorageId),
      transcriptPresent: Boolean(session.transcriptStorageId),
    },
    latestMetricPresent: Boolean(latestMetric),
    traineeSnapshotIncludesSession,
    trainerSnapshotIncludesSession,
  });

  const persisted = await upsertEvaluationRecord(ctx, {
    sessionKey: session.sessionKey,
    orgId: session.orgId,
    trainerId: session.trainerId,
    traineeId: session.traineeId ?? null,
    status: result.status,
    source: "automatic",
    issues: result.issues,
    summary: result.summary,
    attemptCount: 1,
    lastCompletedAt: session.endedAt ?? null,
    evaluatedAt,
  });

  return {
    found: true as const,
    evaluationId: persisted.evaluationId,
    status: result.status,
    attemptCount: persisted.attemptCount,
  };
}

async function traineeSnapshotHasSession(
  ctx: any,
  args: {
    orgId: string;
    traineeId: string;
    sessionKey: string;
  },
) {
  const snapshot = await ctx.runQuery(api.traineeProfiles.getTraineeResultsSnapshot, {
    traineeId: args.traineeId,
    orgId: args.orgId,
    limit: 50,
  });

  if (!snapshot) {
    return false;
  }

  if (snapshot.latestSession?.sessionKey === args.sessionKey) {
    return true;
  }

  return snapshot.history.some((session) => session.sessionKey === args.sessionKey);
}

async function upsertEvaluationRecord(
  ctx: any,
  args: PersistedTrainingSessionEvaluation,
) {
  const now = args.evaluatedAt;
  const existing = await ctx.db
    .query("trainingSessionEvaluations")
    .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
    .first();

  if (!existing) {
    const evaluationId = await ctx.db.insert("trainingSessionEvaluations", {
      sessionKey: args.sessionKey,
      orgId: args.orgId,
      trainerId: args.trainerId,
      traineeId: args.traineeId ?? undefined,
      status: args.status,
      source: args.source,
      issues: args.issues,
      summary: args.summary,
      attemptCount: args.attemptCount,
      lastCompletedAt: args.lastCompletedAt ?? undefined,
      evaluatedAt: args.evaluatedAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      evaluationId,
      attemptCount: args.attemptCount,
    };
  }

  const attemptCount = existing.attemptCount + 1;
  await ctx.db.patch(existing._id, {
    orgId: args.orgId,
    trainerId: args.trainerId,
    traineeId: args.traineeId ?? undefined,
    status: args.status,
    source: args.source,
    issues: args.issues,
    summary: args.summary,
    attemptCount,
    lastCompletedAt: args.lastCompletedAt ?? undefined,
    evaluatedAt: args.evaluatedAt,
    updatedAt: now,
  });

  return {
    evaluationId: existing._id,
    attemptCount,
  };
}
