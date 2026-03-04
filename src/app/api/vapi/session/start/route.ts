import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createTrainingSession, getOrgEntitlement, getOrgTrainerObjectionConfig, recordAlert } from "@/lib/convex";
import { buildAgentVariableValues } from "@/lib/agent-context";
import { validateAssistantVariableContract } from "@/lib/assistant-variable-contract";
import { syncIdentityForRequest } from "@/lib/identitySync";

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
  const { userId, orgId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "Organization context is required." }, { status: 400 });
  }

  let entitlement: {
    mode: "paid" | "trial" | "blocked";
    minutesUsed: number;
    minutesLimit: number | null;
    minutesRemaining: number;
    reason: string;
  };
  const identitySync = await syncIdentityForRequest({
    userId,
    orgId,
    source: "api/vapi/session/start",
    failClosed: true,
  });
  if (!identitySync.ok) {
    return NextResponse.json(
      { error: "Training access is temporarily unavailable. Please retry in one minute." },
      { status: 503 },
    );
  }
  try {
    entitlement = await getOrgEntitlement({ orgId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Entitlement lookup failed";

    try {
      await recordAlert({
        source: "api/vapi/session/start.entitlement",
        severity: "critical",
        message,
        context: { userId, orgId },
      });
    } catch {
      // Ignore secondary logging errors.
    }

    return NextResponse.json(
      { error: "Access status is temporarily unavailable. Please retry in one minute." },
      { status: 503 },
    );
  }

  if (entitlement.mode === "blocked") {
    return NextResponse.json(
      {
        code: "TRIAL_LIMIT_REACHED",
        error: "Trial talk-time limit reached for this organization.",
        message: "Your organization has used all 15 trial minutes. Upgrade to continue.",
        minutesUsed: entitlement.minutesUsed,
        minutesLimit: entitlement.minutesLimit,
        minutesRemaining: entitlement.minutesRemaining,
      },
      { status: 403 },
    );
  }

  const assistantId = (process.env.VAPI_TEST_ASSISTANT_ID ?? process.env.VAPI_ASSISTANT_ID)?.trim();
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim();

  if (!assistantId || !publicKey) {
    return NextResponse.json(
      { error: "Training service is temporarily unavailable. Please contact support." },
      { status: 500 },
    );
  }
  if (assistantId === publicKey) {
    return NextResponse.json(
      {
        error: "Training service is temporarily unavailable. Please contact support.",
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

  const orgObjectionConfig = await getOrgTrainerObjectionConfig({ orgId }).catch(() => null);

  const rebuttals = {
    ...DEFAULT_REBUTTALS,
    ...(orgObjectionConfig?.rebuttalGuides ?? {}),
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

    const variableValues = buildAgentVariableValues({
      difficulty,
      objectionsRequired,
      rebuttals,
      orgRole: sessionClaims?.org_role,
      activeSequence: "session_summary",
      extraVariables: {
        org_id: orgId,
        trainer_id: userId,
        session_key: session.sessionKey,
      },
    });

    const contractValidation = validateAssistantVariableContract(variableValues, "trainer");
    if (!contractValidation.ok) {
      await recordAlert({
        source: "api/vapi/session/start.contract",
        severity: "critical",
        message: "Assistant variable contract validation failed.",
        context: {
          userId,
          orgId,
          sessionKey: session.sessionKey,
          missingKeys: contractValidation.missingKeys,
        },
      }).catch(() => null);

      return NextResponse.json(
        {
          error: "Training service configuration is invalid. Please contact support.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      sessionKey: session.sessionKey,
      assistantId,
      publicKey,
      variableValues,
      metadata: {
        orgId,
        trainerId: userId,
        sessionKey: session.sessionKey,
        sequenceStage: variableValues.email_sequence_stage,
        entitlementMode: entitlement.mode,
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
