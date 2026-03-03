import { NextResponse } from "next/server";
import { getTraineeByInviteTokenHash } from "@/lib/convex";
import { hashInviteToken } from "@/lib/identity-link";
import { setTraineeSessionCookie } from "@/lib/trainee-session-cookie";

type SessionCookiePayload = {
  inviteToken?: string;
};

export async function POST(request: Request) {
  let payload: SessionCookiePayload = {};
  try {
    payload = (await request.json()) as SessionCookiePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.inviteToken || payload.inviteToken.trim().length === 0) {
    return NextResponse.json({ error: "inviteToken is required." }, { status: 400 });
  }

  const trainee = await getTraineeByInviteTokenHash({
    inviteTokenHash: hashInviteToken(payload.inviteToken),
  });
  if (!trainee) {
    return NextResponse.json({ error: "Invalid or expired invite token." }, { status: 404 });
  }

  const response = NextResponse.json({
    ok: true,
    trainee: {
      id: trainee.traineeId,
      name: trainee.name,
      difficulty: trainee.difficultyLevel,
      numObjections: trainee.numObjections,
      status: trainee.status,
    },
  });

  setTraineeSessionCookie(response, {
    traineeId: trainee.traineeId,
    orgId: trainee.orgId,
    trainerId: trainee.trainerId,
  });

  return response;
}
