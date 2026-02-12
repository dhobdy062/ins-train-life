import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createTrainingSession, getOrgBillingAccess, recordAlert } from "@/lib/convex";

type Difficulty = "D1" | "D2" | "D3" | "D4" | "D5";

type SessionStartPayload = {
  difficulty?: Difficulty;
  objectionsRequired?: number;
  rebuttals?: Record<string, string>;
};

const DEFAULT_REBUTTALS: Record<string, string> = {
  busy: "I understand you are busy. This is a quick 15-minute policy review.",
  send_info: "I can send info, and a quick review helps tailor it to your current policy.",
  spouse: "That makes sense. We can schedule a time when your spouse can join.",
  timing: "No problem. We can pick a short time next week that works for you.",
  already_covered: "Great. This is exactly a review of what you already have.",
  not_interested: "Understood. This is a no-pressure policy review, not a sales pitch.",
  dont_remember: "No problem. I am following up on the earlier request for life insurance info.",
};

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

export async function POST(request: Request) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "Organization context is required." }, { status: 400 });
  }

  const access = await getOrgBillingAccess({ orgId }).catch(() => null);
  if (!access?.hasAccess) {
    return NextResponse.json({ error: "Active subscription required for this organization." }, { status: 402 });
  }

  const assistantId = process.env.VAPI_TEST_ASSISTANT_ID ?? process.env.VAPI_ASSISTANT_ID;
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

  if (!assistantId || !publicKey) {
    return NextResponse.json({ error: "VAPI config is missing." }, { status: 500 });
  }
  if (assistantId === publicKey) {
    return NextResponse.json(
      {
        error:
          "VAPI_TEST_ASSISTANT_ID/VAPI_ASSISTANT_ID appears to be set to the public key. Set the assistant ID to a valid Vapi assistant ID.",
      },
      { status: 500 },
    );
  }

  let payload: SessionStartPayload = {};

  try {
    payload = (await request.json()) as SessionStartPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const difficulty = payload.difficulty && ["D1", "D2", "D3", "D4", "D5"].includes(payload.difficulty)
    ? payload.difficulty
    : "D2";

  const objectionsRequired =
    typeof payload.objectionsRequired === "number" && payload.objectionsRequired >= 1 && payload.objectionsRequired <= 7
      ? payload.objectionsRequired
      : 3;

  const rebuttals = {
    ...DEFAULT_REBUTTALS,
    ...(payload.rebuttals ?? {}),
  };

  try {
    const session = await createTrainingSession({
      orgId,
      trainerId: userId,
      assistantId,
      difficulty,
      objectionsRequired,
      rebuttalKeys: Object.keys(rebuttals),
      channel: "web",
    });

    return NextResponse.json({
      sessionKey: session.sessionKey,
      assistantId,
      publicKey,
      variableValues: {
        difficulty,
        objectionsRequired: String(objectionsRequired),
        rebuttals: JSON.stringify(rebuttals),
      },
      metadata: {
        orgId,
        trainerId: userId,
        sessionKey: session.sessionKey,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start session";

    try {
      await recordAlert({
        source: "api/vapi/session/start",
        severity: "critical",
        message,
        context: { userId, orgId },
      });
    } catch {
      // Ignore secondary logging errors.
    }

    return NextResponse.json({ error: "Unable to start session." }, { status: 500 });
  }
}
