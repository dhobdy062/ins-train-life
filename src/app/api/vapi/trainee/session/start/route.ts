import { NextResponse } from "next/server";
import {
  createTrainingSession,
  getOrgTrainerObjectionConfig,
  getTraineeByInviteTokenHash,
  getTraineeProfileByIpHash,
  markTraineeActive,
  recordAlert,
} from "@/lib/convex";
import { buildAgentVariableValues } from "@/lib/agent-context";
import { validateAssistantVariableContract } from "@/lib/assistant-variable-contract";
import { getRequestIpAddress, hashInviteToken, hashIpAddress } from "@/lib/identity-link";
import { setTraineeSessionCookie } from "@/lib/trainee-session-cookie";
import { buildGuideMapForExpected, DEFAULT_REBUTTAL_GUIDES } from "@/lib/trainer-objections";

type TraineeSessionStartPayload = {
  inviteToken?: string;
  confirmedEmail?: string;
};

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

export async function POST(request: Request) {
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

  let payload: TraineeSessionStartPayload = {};
  try {
    payload = (await request.json()) as TraineeSessionStartPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.inviteToken || payload.inviteToken.trim().length === 0) {
    return NextResponse.json({ error: "inviteToken is required." }, { status: 400 });
  }
  if (!payload.confirmedEmail || payload.confirmedEmail.trim().length === 0) {
    return NextResponse.json({ error: "confirmedEmail is required." }, { status: 400 });
  }

  const trainee = await getTraineeByInviteTokenHash({
    inviteTokenHash: hashInviteToken(payload.inviteToken),
  });
  if (!trainee) {
    return NextResponse.json({ error: "Invalid or expired invite token." }, { status: 404 });
  }
  const normalizedConfirmedEmail = payload.confirmedEmail.trim().toLowerCase();
  if (normalizedConfirmedEmail !== trainee.email) {
    return NextResponse.json({ error: "Email does not match invitation." }, { status: 403 });
  }

  const ipAddress = getRequestIpAddress(request);
  if (!ipAddress) {
    return NextResponse.json({ error: "Unable to confirm access from this device." }, { status: 400 });
  }

  const ipHash = hashIpAddress(ipAddress);
  const profileByIp = await getTraineeProfileByIpHash({ ipHash });

  if (!profileByIp || profileByIp.traineeId !== trainee.traineeId) {
    return NextResponse.json(
      {
        error: "Access confirmation required before starting training.",
        code: "IP_CONSENT_REQUIRED",
      },
      { status: 403 },
    );
  }

  const orgConfig = await getOrgTrainerObjectionConfig({ orgId: trainee.orgId }).catch(() => null);
  const rebuttals = buildGuideMapForExpected(
    trainee.expectedRebuttals,
    orgConfig?.rebuttalGuides ?? DEFAULT_REBUTTAL_GUIDES,
  );

  const session = await createTrainingSession({
    orgId: trainee.orgId,
    trainerId: trainee.trainerId,
    traineeId: trainee.traineeId,
    assistantId,
    difficulty: trainee.difficultyLevel,
    objectionsRequired: trainee.numObjections,
    rebuttalKeys: trainee.expectedRebuttals,
    channel: "web",
    identityMode: "ip_match",
    ipHash,
    profileSnapshot: {
      difficultyLevel: trainee.difficultyLevel,
      objectionsRequired: trainee.numObjections,
      expectedRebuttals: trainee.expectedRebuttals,
    },
  });

  await markTraineeActive({ traineeId: trainee.traineeId }).catch(() => null);

  const variableValues = buildAgentVariableValues({
    difficulty: trainee.difficultyLevel,
    objectionsRequired: trainee.numObjections,
    rebuttals,
    orgRole: null,
    activeSequence: "trainee_invitation",
    extraVariables: {
      org_id: trainee.orgId,
      trainer_id: trainee.trainerId,
      trainee_id: trainee.traineeId,
      trainee_name: trainee.name,
      session_key: session.sessionKey,
      expected_rebuttals: JSON.stringify(trainee.expectedRebuttals),
    },
  });

  const contractValidation = validateAssistantVariableContract(variableValues, "trainee");
  if (!contractValidation.ok) {
    await recordAlert({
      source: "api/vapi/trainee/session/start.contract",
      severity: "critical",
      message: "Assistant variable contract validation failed.",
      context: {
        sessionKey: session.sessionKey,
        traineeId: trainee.traineeId,
        orgId: trainee.orgId,
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

  const response = NextResponse.json({
    sessionKey: session.sessionKey,
    assistantId,
    publicKey,
    variableValues,
    metadata: {
      orgId: trainee.orgId,
      trainerId: trainee.trainerId,
      traineeId: trainee.traineeId,
      sessionKey: session.sessionKey,
      sequenceStage: variableValues.email_sequence_stage,
    },
  });

  setTraineeSessionCookie(response, {
    traineeId: trainee.traineeId,
    orgId: trainee.orgId,
    trainerId: trainee.trainerId,
  });

  return response;
}
