import crypto from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createTraineeProfile, listTraineesByOrg, logEmailEvent } from "@/lib/convex";
import { getAppUrl, getEmailClient, getFromAddress } from "@/lib/email";
import { renderEmailSequence } from "@/lib/email-sequences";
import { hashInviteToken } from "@/lib/identity-link";
import { buildExpectedRebuttals, isDifficultyLevel, type DifficultyLevel } from "@/lib/training-profile";

type CreateTraineePayload = {
  name?: string;
  email?: string;
  difficultyLevel?: string;
  numObjections?: number;
  trainerName?: string;
};

function hashEmail(email: string) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function buildInviteToken() {
  return `${crypto.randomBytes(18).toString("hex")}${Date.now().toString(36)}`;
}

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "Organization context is required." }, { status: 400 });
  }

  const trainees = await listTraineesByOrg({ orgId, limit: 100 });
  return NextResponse.json({ trainees });
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "Organization context is required." }, { status: 400 });
  }

  let payload: CreateTraineePayload = {};
  try {
    payload = (await request.json()) as CreateTraineePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const name = payload.name?.trim();
  const email = payload.email?.trim().toLowerCase();
  const difficulty: DifficultyLevel =
    payload.difficultyLevel && isDifficultyLevel(payload.difficultyLevel) ? payload.difficultyLevel : "D2";
  const objectionsRequired =
    typeof payload.numObjections === "number" && payload.numObjections >= 1 && payload.numObjections <= 7
      ? payload.numObjections
      : 3;

  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const expectedRebuttals = buildExpectedRebuttals(difficulty, objectionsRequired);
  const inviteToken = buildInviteToken();
  const inviteTokenHash = hashInviteToken(inviteToken);

  const result = await createTraineeProfile({
    orgId,
    trainerId: userId,
    name,
    email,
    difficultyLevel: difficulty,
    numObjections: objectionsRequired,
    expectedRebuttals,
    inviteTokenHash,
  });

  const trainingUrl = `${getAppUrl()}/training/start?invite=${encodeURIComponent(inviteToken)}`;
  const rendered = renderEmailSequence({
    sequence: "trainee_invitation",
    variables: {
      traineeName: name,
      trainerName: payload.trainerName?.trim() || "Your trainer",
      trainingUrl,
      difficulty,
    },
  });

  if (rendered.ok) {
    try {
      const resend = getEmailClient();
      const sendResult = await resend.emails.send({
        from: getFromAddress(),
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: {
          "X-Cream-Sequence": "trainee_invitation",
        },
      });

      await logEmailEvent({
        provider: "resend",
        eventType: "sequence_send",
        sequence: "trainee_invitation",
        orgId,
        recipient: email,
        recipientHash: hashEmail(email),
        status: sendResult.error ? "failed" : "sent",
        providerMessageId: sendResult.data?.id ?? undefined,
        error: sendResult.error?.message,
        metadata: {
          source: "api/trainer/trainees",
          traineeId: result.traineeId,
        },
      }).catch(() => null);

      if (sendResult.error) {
        return NextResponse.json(
          {
            error: "Trainee created, but invitation email failed to send.",
            traineeId: result.traineeId,
            trainingUrl,
          },
          { status: 502 },
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send invitation email";
      return NextResponse.json(
        {
          error: "Trainee created, but invitation email failed to send.",
          details: message,
          traineeId: result.traineeId,
          trainingUrl,
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    traineeId: result.traineeId,
    created: result.created,
    difficulty,
    numObjections: objectionsRequired,
    expectedRebuttals,
    trainingUrl,
  });
}
