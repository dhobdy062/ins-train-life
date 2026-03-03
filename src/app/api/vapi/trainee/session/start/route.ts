import { NextResponse } from "next/server";
import {
  createTrainingSession,
  getTraineeByInviteTokenHash,
  getTraineeProfileByIpHash,
  markTraineeActive,
  recordAlert,
} from "@/lib/convex";
import { buildAgentVariableValues } from "@/lib/agent-context";
import { validateAssistantVariableContract } from "@/lib/assistant-variable-contract";
import { getRequestIpAddress, hashInviteToken, hashIpAddress } from "@/lib/identity-link";
import { setTraineeSessionCookie } from "@/lib/trainee-session-cookie";
import { DEFAULT_REBUTTAL_GUIDES } from "@/lib/training-profile";

type TraineeSessionStartPayload = {
  inviteToken?: string;
};

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

export async function POST(request: Request) {
  const assistantId = (process.env.VAPI_TEST_ASSISTANT_ID ?? process.env.VAPI_ASSISTANT_ID)?.trim();
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim();

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

  let payload: TraineeSessionStartPayload = {};
  try {
    payload = (await request.json()) as TraineeSessionStartPayload;
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

  const ipAddress = getRequestIpAddress(request);
  if (!ipAddress) {
    return NextResponse.json({ error: "Unable to resolve client IP address." }, { status: 400 });
  }

  const ipHash = hashIpAddress(ipAddress);
  const profileByIp = await getTraineeProfileByIpHash({ ipHash });

  if (!profileByIp || profileByIp.traineeId !== trainee.traineeId) {
    return NextResponse.json(
      {
        error: "IP consent required before starting training.",
        code: "IP_CONSENT_REQUIRED",
      },
      { status: 403 },
    );
  }

  const rebuttals = trainee.expectedRebuttals.reduce<Record<string, string>>((acc, rebuttalType) => {
    acc[rebuttalType] = DEFAULT_REBUTTAL_GUIDES[rebuttalType] ?? "Acknowledge concern and guide to a short next step.";
    return acc;
  }, {});

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
        error: `Assistant variable contract is invalid. Missing keys: ${contractValidation.missingKeys.join(", ")}`,
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
