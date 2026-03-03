import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordAlert, reserveTrialSession } from "@/lib/convex";
import { verifyToken } from "@/lib/token";
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
  const secret = process.env.VERIFY_HMAC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing VERIFY_HMAC_SECRET" }, { status: 500 });
  }

  const assistantId = process.env.VAPI_ASSISTANT_ID?.trim();
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim();
  if (!assistantId || !publicKey) {
    return NextResponse.json({ error: "VAPI config is missing." }, { status: 500 });
  }
  if (assistantId === publicKey) {
    return NextResponse.json(
      {
        error:
          "VAPI_ASSISTANT_ID appears to be set to the public key. Set VAPI_ASSISTANT_ID to your Vapi assistant ID.",
      },
      { status: 500 },
    );
  }

  const trialIdentityToken = request.cookies.get("demo_trial_identity")?.value;
  if (!trialIdentityToken) {
    return NextResponse.json({ error: "Verification required." }, { status: 401 });
  }

  const identityPayload = (() => {
    try {
      return verifyToken(trialIdentityToken, secret);
    } catch {
      return null;
    }
  })();
  if (!identityPayload?.email) {
    return NextResponse.json({ error: "Invalid verification token." }, { status: 401 });
  }

  const normalizedEmail = identityPayload.email.trim().toLowerCase();
  const emailHash = crypto.createHash("sha256").update(normalizedEmail).digest("hex");
  const sessionKey = buildSessionKey();

  const reservation = await reserveTrialSession({ emailHash, sessionKey });
  if (!reservation.allowed) {
    return NextResponse.json(
      {
        code: "TRIAL_LIMIT_REACHED",
        message: "You have used all 3 trial sessions.",
        ctaUrl: "/sign-up",
      },
      { status: 403 },
    );
  }

  const variableValues = buildAgentVariableValues({
    difficulty: "D2",
    objectionsRequired: 2,
    rebuttals: DEFAULT_REBUTTALS,
    orgRole: null, // Trial users are always trainees
    activeSequence: "trainee_invitation",
    extraVariables: {
      trial_mode: "true",
      session_key: sessionKey,
      trainee_email_hash: emailHash,
    },
  });

  const contractValidation = validateAssistantVariableContract(variableValues, "trial");
  if (!contractValidation.ok) {
    await recordAlert({
      source: "api/vapi/trial/start.contract",
      severity: "critical",
      message: "Assistant variable contract validation failed for trial session.",
      context: {
        sessionKey,
        missingKeys: contractValidation.missingKeys,
      },
    }).catch(() => null);

    return NextResponse.json(
      {
        error: `Assistant variable contract is invalid. Missing keys: ${contractValidation.missingKeys.join(", ")}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    sessionKey,
    assistantId,
    publicKey,
    remainingTrialSessions: reservation.remaining,
    variableValues,
    metadata: {
      sessionKey,
      source: "web_trial",
      sequenceStage: "trainee_invitation",
    },
  });
}
