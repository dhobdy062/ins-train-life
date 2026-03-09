import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getTraineeByClerkUserId, getTraineeByOrgAndEmail, getTraineeResultsSnapshot } from "@/lib/convex";

function toIso(timestamp: number | null | undefined) {
  if (!timestamp) {
    return null;
  }
  return new Date(timestamp).toISOString();
}

function resolvePrimaryEmailAddress(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) {
    return null;
  }

  const primaryId = user.primaryEmailAddressId ?? null;
  const emailAddresses = Array.isArray(user.emailAddresses) ? user.emailAddresses : [];
  const primaryMatch = primaryId ? emailAddresses.find((email) => email.id === primaryId) : null;
  const candidate = primaryMatch?.emailAddress ?? emailAddresses[0]?.emailAddress ?? null;

  if (!candidate) {
    return null;
  }

  const normalized = candidate.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export async function GET(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 25) : undefined;

  let trainee = await getTraineeByClerkUserId({
    orgId,
    clerkUserId: userId,
  }).catch(() => null);

  if (!trainee) {
    const user = await currentUser().catch(() => null);
    const primaryEmail = resolvePrimaryEmailAddress(user);
    if (primaryEmail) {
      trainee = await getTraineeByOrgAndEmail({
        orgId,
        email: primaryEmail,
      }).catch(() => null);
    }
  }

  if (!trainee) {
    return NextResponse.json({ error: "Trainee not found." }, { status: 404 });
  }

  const snapshot = await getTraineeResultsSnapshot({
    traineeId: trainee.traineeId,
    orgId,
    limit,
  });
  if (!snapshot) {
    return NextResponse.json({ error: "Trainee not found." }, { status: 404 });
  }

  return NextResponse.json({
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
