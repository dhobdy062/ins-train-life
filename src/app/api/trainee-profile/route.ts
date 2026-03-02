import { NextResponse } from "next/server";
import { getTraineeProfileByIpHash } from "@/lib/convex";
import { getRequestIpAddress, hashIpAddress } from "@/lib/identity-link";

function isAuthorized(request: Request) {
  const expectedApiKey = process.env.TRAINEE_PROFILE_API_KEY;
  if (!expectedApiKey) {
    return true;
  }

  const providedKey = request.headers.get("x-api-key");
  return providedKey === expectedApiKey;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const explicitIp = searchParams.get("ip");
  const ipAddress = explicitIp?.trim() || getRequestIpAddress(request);

  if (!ipAddress) {
    return NextResponse.json({ error: "IP address is required." }, { status: 400 });
  }

  const profile = await getTraineeProfileByIpHash({ ipHash: hashIpAddress(ipAddress) });
  if (!profile) {
    return NextResponse.json({ error: "Trainee not found", code: "TRAINEE_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    traineeId: profile.traineeId,
    name: profile.name,
    email: profile.email,
    trainerId: profile.trainerId,
    difficultyLevel: profile.difficultyLevel,
    numObjections: profile.numObjections,
    expectedRebuttals: profile.expectedRebuttals,
    lastActive: profile.lastActiveAt ? new Date(profile.lastActiveAt).toISOString() : null,
  });
}
