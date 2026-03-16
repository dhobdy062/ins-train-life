import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTraineeResultsSnapshot } from "@/lib/convex";
import { resolveAuthenticatedTrainee } from "@/lib/trainee-access";

function toIso(timestamp: number | null | undefined) {
  if (!timestamp) {
    return null;
  }
  return new Date(timestamp).toISOString();
}

export async function GET(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to open your trainee dashboard." }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Choose your team to open the trainee dashboard." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 25) : undefined;

  const traineeAccess = await resolveAuthenticatedTrainee({
    userId,
    orgId,
    source: "api/trainee/results",
  });
  const trainee = traineeAccess.trainee;

  if (!trainee) {
    return NextResponse.json({ error: "Your trainee seat is not active for this team yet." }, { status: 404 });
  }

  const snapshot = await getTraineeResultsSnapshot({
    traineeId: trainee.traineeId,
    orgId,
    limit,
  });
  if (!snapshot) {
    return NextResponse.json({ error: "Your trainee dashboard could not be loaded for this team." }, { status: 404 });
  }

  return NextResponse.json({
    resolution: traineeAccess.resolution,
    identityRepaired: traineeAccess.repaired,
    trainee: {
      id: snapshot.trainee.id,
      name: snapshot.trainee.name,
      difficulty: snapshot.trainee.difficulty,
      numObjections: snapshot.trainee.numObjections,
      status: snapshot.trainee.status,
    },
    latestSession: snapshot.latestSession
      ? {
          sessionKey: snapshot.latestSession.sessionKey,
          startedAt: toIso(snapshot.latestSession.startedAt),
          endedAt: toIso(snapshot.latestSession.endedAt),
          status: snapshot.latestSession.status,
          assistantId: snapshot.latestSession.assistantId,
          structuredOutcome: snapshot.latestSession.structuredOutcome,
          recordingUrl: snapshot.latestSession.recordingUrl,
          transcriptUrl: snapshot.latestSession.transcriptUrl,
        }
      : null,
    latestMetrics: snapshot.latestMetrics
      ? {
          score: snapshot.latestMetrics.rebuttalScore,
          durationSeconds: snapshot.latestMetrics.durationSeconds,
          toneStrikes: snapshot.latestMetrics.toneStrikeCount,
          appointmentSet: snapshot.latestMetrics.appointmentSet,
          eventType: snapshot.latestMetrics.eventType,
          createdAt: toIso(snapshot.latestMetrics.createdAt),
        }
      : null,
    latestRebuttals: snapshot.latestRebuttals.map((rebuttal) => ({
      expectedType: rebuttal.rebuttalTypeExpected,
      objectionId: rebuttal.objectionId,
      response: rebuttal.response,
      tone: rebuttal.toneAnalysis,
      score: rebuttal.score,
      grade: rebuttal.grade,
      feedback: rebuttal.feedback,
      createdAt: toIso(rebuttal.createdAt),
    })),
    assignedSessions: snapshot.assignedSessions.map((session) => ({
      sessionKey: session.sessionKey,
      status: session.status,
      difficulty: session.difficulty,
      objectionsRequired: session.objectionsRequired,
      createdAt: toIso(session.createdAt),
      startedAt: toIso(session.startedAt),
      selectedObjections: session.selectedObjections,
    })),
    history: snapshot.history.map((session) => ({
      sessionKey: session.sessionKey,
      startedAt: toIso(session.startedAt),
      endedAt: toIso(session.endedAt),
      status: session.status,
      assistantId: session.assistantId,
      difficulty: session.difficulty,
      objectionsRequired: session.objectionsRequired,
      selectedObjections: session.selectedObjections,
      structuredOutcome: session.structuredOutcome,
      recordingUrl: session.recordingUrl,
      transcriptUrl: session.transcriptUrl,
      metrics: session.metrics
        ? {
            score: session.metrics.rebuttalScore,
            durationSeconds: session.metrics.durationSeconds,
            toneStrikes: session.metrics.toneStrikeCount,
            appointmentSet: session.metrics.appointmentSet,
            eventType: session.metrics.eventType,
            createdAt: toIso(session.metrics.createdAt),
          }
        : null,
    })),
  });
}
