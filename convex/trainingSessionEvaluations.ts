import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { summarizeTrainingSessionEvaluationsForAdmin } from "../src/lib/training-session-evaluation-admin";
import {
  evaluateTrainingSessionDataFlow,
  hasMeaningfulStructuredOutcome,
  isTrainingSessionVisibleInTraineeResults,
  isTrainingSessionVisibleInTrainerSessionBuilder,
  webhookPayloadExpectsStructuredOutcome,
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
    return upsertAutomaticEvaluationForSessionInContext(ctx, {
      ...args,
      source: "automatic",
    });
  },
});

export const rerunTrainingSessionEvaluation = mutation({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    trainerId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trainingSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!session || session.orgId !== args.orgId || session.trainerId !== args.trainerId) {
      throw new Error("Session not found.");
    }

    return upsertAutomaticEvaluationForSessionInContext(ctx, {
      sessionKey: args.sessionKey,
      source: "manual",
    });
  },
});

export const getTrainingSessionEvaluationBySessionKey = internalQuery({
  args: {
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    return getTrainingSessionEvaluationBySessionKeyInContext(ctx, args);
  },
});

export const getTrainingSessionEvaluationAdminSnapshot = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 50);
    const rows = await ctx.db.query("trainingSessionEvaluations").collect();
    const evaluations = listCanonicalEvaluationRows(rows).sort((left, right) => right.evaluatedAt - left.evaluatedAt);
    const summary = summarizeTrainingSessionEvaluationsForAdmin(
      evaluations.map((evaluation) => ({
        sessionKey: evaluation.sessionKey,
        status: evaluation.status,
        evaluatedAt: evaluation.evaluatedAt,
      })),
      limit,
    );
    const evaluationBySessionKey = new Map(evaluations.map((evaluation) => [evaluation.sessionKey, evaluation]));

    return {
      generatedAt: Date.now(),
      counts: summary.counts,
      recentIssues: await Promise.all(
        summary.recentIssues.map(async (issue) => {
          const evaluation = evaluationBySessionKey.get(issue.sessionKey);
          if (!evaluation) {
            throw new Error(`Missing canonical evaluation row for ${issue.sessionKey}`);
          }

          const session = await ctx.db
            .query("trainingSessions")
            .withIndex("by_sessionKey", (q) => q.eq("sessionKey", evaluation.sessionKey))
            .first();
          const trainee = session?.traineeId ? await ctx.db.get(session.traineeId as any) : null;

          return {
            evaluationId: evaluation._id,
            sessionKey: evaluation.sessionKey,
            orgId: evaluation.orgId,
            trainerId: evaluation.trainerId,
            traineeId: evaluation.traineeId ?? null,
            traineeName: trainee?.name ?? "Unknown trainee",
            sessionStatus: session?.status ?? null,
            status: evaluation.status,
            source: evaluation.source,
            issues: evaluation.issues,
            summary: evaluation.summary,
            attemptCount: evaluation.attemptCount,
            lastCompletedAt: evaluation.lastCompletedAt ?? session?.endedAt ?? null,
            evaluatedAt: evaluation.evaluatedAt,
          };
        }),
      ),
    };
  },
});

export async function upsertAutomaticEvaluationForSessionInContext(
  ctx: any,
  args: {
    sessionKey: string;
    source?: "automatic" | "manual";
  },
) {
  const session = await ctx.db
    .query("trainingSessions")
    .withIndex("by_sessionKey", (q: any) => q.eq("sessionKey", args.sessionKey))
    .first();

  if (!session) {
    return { found: false as const, evaluationId: null };
  }

  const recentMetrics = await ctx.db
    .query("sessionMetrics")
    .withIndex("by_sessionKey", (q: any) => q.eq("sessionKey", args.sessionKey))
    .order("desc")
    .take(10);

  const structuredOutcomeExpected = recentMetrics.some((metric: { rawPayload?: unknown }) =>
    webhookPayloadExpectsStructuredOutcome(metric.rawPayload),
  );

  const trainerSnapshotIncludesSession = isTrainingSessionVisibleInTrainerSessionBuilder({
    sessionOrgId: session.orgId,
    sessionTrainerId: session.trainerId,
    orgId: session.orgId,
    trainerId: session.trainerId,
  });

  const trainee = session.traineeId ? await ctx.db.get(session.traineeId as any) : null;
  const traineeSnapshotIncludesSession =
    session.traineeId && trainee
      ? isTrainingSessionVisibleInTraineeResults({
          sessionOrgId: session.orgId,
          sessionTraineeId: session.traineeId,
          sessionStatus: session.status,
          traineeId: trainee._id,
          traineeOrgId: trainee.orgId,
          traineeStatus: trainee.status,
          orgId: session.orgId,
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
      structuredOutcomeExpected,
      structuredOutcomePresent: hasMeaningfulStructuredOutcome(session.structuredOutcome),
      recordingPresent: Boolean(session.recordingStorageId),
      transcriptPresent: Boolean(session.transcriptStorageId),
    },
    latestMetricPresent: recentMetrics.length > 0,
    traineeSnapshotIncludesSession,
    trainerSnapshotIncludesSession,
  });

  const persisted = await upsertEvaluationRecord(ctx, {
    sessionKey: session.sessionKey,
    orgId: session.orgId,
    trainerId: session.trainerId,
    traineeId: session.traineeId ?? null,
    status: result.status,
    source: args.source ?? "automatic",
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

export async function getTrainingSessionEvaluationBySessionKeyInContext(
  ctx: any,
  args: {
    sessionKey: string;
  },
) {
  const rows = await ctx.db
    .query("trainingSessionEvaluations")
    .withIndex("by_sessionKey", (q: any) => q.eq("sessionKey", args.sessionKey))
    .collect();
  const evaluation = chooseCanonicalEvaluationRow(rows);

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
}

async function upsertEvaluationRecord(
  ctx: any,
  args: PersistedTrainingSessionEvaluation,
) {
  const now = args.evaluatedAt;
  const existingRows = await ctx.db
    .query("trainingSessionEvaluations")
    .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
    .collect();

  if (existingRows.length === 0) {
    const insertedId = await ctx.db.insert("trainingSessionEvaluations", {
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

    return reconcileEvaluationRows(ctx, args.sessionKey, {
      ...args,
      attemptCount: 1,
    }, insertedId);
  }

  return reconcileEvaluationRows(ctx, args.sessionKey, {
    ...args,
    attemptCount: existingRows.reduce((total: number, row: { attemptCount: number }) => total + row.attemptCount, 0) + 1,
  });
}

async function reconcileEvaluationRows(
  ctx: any,
  sessionKey: string,
  args: PersistedTrainingSessionEvaluation,
  preferredEvaluationId?: string,
) {
  const rows = await ctx.db
    .query("trainingSessionEvaluations")
    .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
    .collect();

  const canonical = chooseCanonicalEvaluationRow(rows, preferredEvaluationId);
  if (!canonical) {
    throw new Error(`Missing canonical evaluation row for ${sessionKey}`);
  }

  const attemptCount = Math.max(
    args.attemptCount,
    rows.reduce((total: number, row: { attemptCount: number }) => total + row.attemptCount, 0),
  );
  await ctx.db.patch(canonical._id, {
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
    updatedAt: args.evaluatedAt,
  });

  for (const row of rows) {
    if (row._id !== canonical._id) {
      await ctx.db.delete(row._id);
    }
  }

  return {
    evaluationId: canonical._id,
    attemptCount,
  };
}

function chooseCanonicalEvaluationRow(
  rows: Array<{ _id: string; createdAt?: number; _creationTime?: number }>,
  preferredEvaluationId?: string,
) {
  if (rows.length === 0) {
    return null;
  }

  return [...rows].sort((left, right) => {
    if (preferredEvaluationId) {
      if (left._id === preferredEvaluationId) {
        return -1;
      }
      if (right._id === preferredEvaluationId) {
        return 1;
      }
    }

    const leftCreatedAt = left.createdAt ?? left._creationTime ?? 0;
    const rightCreatedAt = right.createdAt ?? right._creationTime ?? 0;
    if (leftCreatedAt !== rightCreatedAt) {
      return leftCreatedAt - rightCreatedAt;
    }

    return String(left._id).localeCompare(String(right._id));
  })[0];
}

function listCanonicalEvaluationRows<
  T extends {
    sessionKey: string;
    _id: string;
    createdAt?: number;
    _creationTime?: number;
  },
>(rows: T[]) {
  const rowsBySessionKey = new Map<string, T[]>();

  for (const row of rows) {
    const existing = rowsBySessionKey.get(row.sessionKey);
    if (existing) {
      existing.push(row);
      continue;
    }

    rowsBySessionKey.set(row.sessionKey, [row]);
  }

  return Array.from(rowsBySessionKey.values())
    .map((sessionRows) => chooseCanonicalEvaluationRow(sessionRows))
    .filter((row): row is T => Boolean(row));
}
