import { NextResponse } from "next/server";
import { linkTraineeIpByInviteTokenHash } from "@/lib/convex";
import { getRequestIpAddress, hashInviteToken, hashIpAddress, maskIpAddress } from "@/lib/identity-link";
import { setTraineeSessionCookie } from "@/lib/trainee-session-cookie";

type ConsentPayload = {
  inviteToken?: string;
};

export async function POST(request: Request) {
  let payload: ConsentPayload = {};
  try {
    payload = (await request.json()) as ConsentPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.inviteToken || payload.inviteToken.trim().length === 0) {
    return NextResponse.json({ error: "inviteToken is required." }, { status: 400 });
  }

  const ipAddress = getRequestIpAddress(request);
  if (!ipAddress) {
    return NextResponse.json({ error: "Unable to confirm access from this device." }, { status: 400 });
  }

  try {
    const result = await linkTraineeIpByInviteTokenHash({
      inviteTokenHash: hashInviteToken(payload.inviteToken),
      ipHash: hashIpAddress(ipAddress),
      ipAddressMasked: maskIpAddress(ipAddress),
    });

    const response = NextResponse.json({
      ok: true,
      traineeId: result.traineeId,
      traineeName: result.name,
      difficultyLevel: result.difficultyLevel,
      numObjections: result.numObjections,
      expectedRebuttals: result.expectedRebuttals,
      consentedAt: result.consentedAt,
    });

    setTraineeSessionCookie(response, {
      traineeId: result.traineeId,
      orgId: result.orgId,
      trainerId: result.trainerId,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to confirm access.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
