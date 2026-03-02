import { NextResponse } from "next/server";
import { linkTraineeIpByInviteTokenHash } from "@/lib/convex";
import { getRequestIpAddress, hashInviteToken, hashIpAddress, maskIpAddress } from "@/lib/identity-link";

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
    return NextResponse.json({ error: "Unable to resolve client IP address." }, { status: 400 });
  }

  try {
    const result = await linkTraineeIpByInviteTokenHash({
      inviteTokenHash: hashInviteToken(payload.inviteToken),
      ipHash: hashIpAddress(ipAddress),
      ipAddressMasked: maskIpAddress(ipAddress),
    });

    return NextResponse.json({
      ok: true,
      traineeId: result.traineeId,
      traineeName: result.name,
      difficultyLevel: result.difficultyLevel,
      numObjections: result.numObjections,
      expectedRebuttals: result.expectedRebuttals,
      consentedAt: result.consentedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to link IP.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
