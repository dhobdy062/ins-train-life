import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getDemoProspectByUserAndOrg,
  recordAlert,
  reserveAuthenticatedDemoSession,
} from "@/lib/convex";
import { buildAgentVariableValues } from "@/lib/agent-context";
import { validateAssistantVariableContract } from "@/lib/assistant-variable-contract";

const DEFAULT_REBUTTALS: Record<string, string> = {
  busy: "I understand you are busy. This is a quick 15-minute policy review.",
  send_info: "I can send info, and a quick review helps tailor it to your current policy.",
  spouse: "That makes sense. We can schedule a time when your spouse can join.",
};

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

function buildSessionKey() {
  return `trial_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: NextRequest) {
  const { userId, orgId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in before starting your demo." }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "Organization context is required." }, { status: 400 });
  }

  const assistantId = process.env.VAPI_ASSISTANT_ID?.trim();
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

  const demoProspect = await getDemoProspectByUserAndOrg({
    clerkUserId: userId,
    orgId,
  });
  if (!demoProspect) {
    return NextResponse.json({ error: "Demo access is unavailable for this account." }, { status: 403 });
  }

  const sessionKey = buildSessionKey();

  const reservation = await reserveAuthenticatedDemoSession({
    clerkUserId: userId,
    orgId,
    sessionKey,
  });
  const reservedSessionKey = reservation.sessionKey;
  if (!reservation.allowed) {
    return NextResponse.json(
      {
        code: "TRIAL_LIMIT_REACHED",
        message: "You have used both demo sessions.",
        ctaUrl: "/sign-up",
      },
      { status: 403 },
    );
  }

  const variableValues = buildAgentVariableValues({
    difficulty: "D2",
    objectionsRequired: 2,
    rebuttals: DEFAULT_REBUTTALS,
    orgRole: sessionClaims?.org_role,
    activeSequence: "trainee_invitation",
    extraVariables: {
      trial_mode: "true",
      session_key: reservedSessionKey,
      org_id: orgId,
      clerk_user_id: userId,
      demo_prospect_name: demoProspect.name,
    },
  });

  const contractValidation = validateAssistantVariableContract(variableValues, "trial");
  if (!contractValidation.ok) {
    await recordAlert({
      source: "api/vapi/trial/start.contract",
      severity: "critical",
        message: "Assistant variable contract validation failed for trial session.",
        context: {
        sessionKey: reservedSessionKey,
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
    sessionKey: reservedSessionKey,
    assistantId,
    publicKey,
    remainingTrialSessions: reservation.remaining,
    variableValues,
    metadata: {
      sessionKey: reservedSessionKey,
      source: "authenticated_demo",
      orgId,
      clerkUserId: userId,
      sequenceStage: "authenticated_demo",
    },
  });
}
