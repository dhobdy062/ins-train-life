import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getTraineeByInviteTokenHash, getTraineeByOrgAndEmail, getTraineeResultsSnapshot } from "@/lib/convex";
import { hashInviteToken } from "@/lib/identity-link";
import {
  TRAINEE_SESSION_COOKIE_NAME,
  setTraineeSessionCookie,
  verifyTraineeSessionCookie,
} from "@/lib/trainee-session-cookie";

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const inviteToken = searchParams.get("inviteToken") ?? searchParams.get("invite");
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 25) : undefined;
  const { userId, orgId } = await auth();

  const rawCookie = request.cookies.get(TRAINEE_SESSION_COOKIE_NAME)?.value;
  const cookieIdentity = verifyTraineeSessionCookie(rawCookie);

  let identity: { traineeId: string; orgId: string; trainerId: string } | null = cookieIdentity
    ? {
        traineeId: cookieIdentity.traineeId,
        orgId: cookieIdentity.orgId,
        trainerId: cookieIdentity.trainerId,
      }
    : null;

  if (!identity && inviteToken && inviteToken.trim().length > 0) {
    const trainee = await getTraineeByInviteTokenHash({
      inviteTokenHash: hashInviteToken(inviteToken),
    });
    if (trainee) {
      identity = {
        traineeId: trainee.traineeId,
        orgId: trainee.orgId,
        trainerId: trainee.trainerId,
      };
    }
  }

  if (!identity && userId && orgId) {
    const user = await currentUser().catch(() => null);
    const primaryEmail = resolvePrimaryEmailAddress(user);

    if (primaryEmail) {
      const trainee = await getTraineeByOrgAndEmail({
        orgId,
        email: primaryEmail,
      }).catch(() => null);

      if (trainee) {
        identity = {
          traineeId: trainee.traineeId,
          orgId: trainee.orgId,
          trainerId: trainee.trainerId,
        };
      }
    }
  }

  if (!identity) {
    if (rawCookie) {
      return NextResponse.json({ error: "Invalid trainee session cookie." }, { status: 401 });
    }
    return NextResponse.json({ error: "Trainee session cookie is required." }, { status: 401 });
  }

  const snapshot = await getTraineeResultsSnapshot({
    traineeId: identity.traineeId,
    orgId: identity.orgId,
    limit,
  });

  if (!snapshot) {
    return NextResponse.json({ error: "Trainee not found." }, { status: 404 });
  }

  const response = NextResponse.json({
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
    history: snapshot.history.map((session) => ({
      sessionKey: session.sessionKey,
      startedAt: toIso(session.startedAt),
      endedAt: toIso(session.endedAt),
      status: session.status,
      assistantId: session.assistantId,
      difficulty: session.difficulty,
      objectionsRequired: session.objectionsRequired,
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

  setTraineeSessionCookie(response, {
    traineeId: snapshot.trainee.id,
    orgId: identity.orgId,
    trainerId: identity.trainerId,
  });

  return response;
}
