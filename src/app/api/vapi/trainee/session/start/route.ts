import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getAssignedSessionForTraineeStart,
  markAssignedSessionStarted,
  recordAlert,
} from "@/lib/convex";
import { buildAgentVariableValues } from "@/lib/agent-context";
import { validateAssistantVariableContract } from "@/lib/assistant-variable-contract";
import { resolveAuthenticatedTrainee } from "@/lib/trainee-access";

type TraineeSessionStartPayload = {
  sessionKey?: string;
};

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in before starting your assigned session." }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Choose your team before starting this session." }, { status: 400 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Training service is temporarily unavailable. Please contact support." },
      { status: 500 },
    );
  }

  let payload: TraineeSessionStartPayload = {};
  try {
    payload = (await request.json()) as TraineeSessionStartPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.sessionKey || payload.sessionKey.trim().length === 0) {
    return NextResponse.json({ error: "Session key is required." }, { status: 400 });
  }

  await resolveAuthenticatedTrainee({
    userId,
    orgId,
    source: "api/vapi/trainee/session/start",
  });

  const assignedSession = await getAssignedSessionForTraineeStart({
    sessionKey: payload.sessionKey.trim(),
    orgId,
    clerkUserId: userId,
  });

  if (!assignedSession) {
    return NextResponse.json({ error: "This assigned session is no longer available." }, { status: 404 });
  }

  if (assignedSession.assistantId === publicKey) {
    return NextResponse.json(
      { error: "Training service is temporarily unavailable. Please contact support." },
      { status: 500 },
    );
  }

  const variableValues = buildAgentVariableValues({
    difficulty: assignedSession.difficulty,
    objectionsRequired: assignedSession.objectionsRequired,
    rebuttals: assignedSession.rebuttalGuideMap,
    orgRole: null,
    activeSequence: "trainee_invitation",
    extraVariables: {
      org_id: assignedSession.orgId,
      trainer_id: assignedSession.trainerId,
      trainee_id: assignedSession.traineeId,
      trainee_name: assignedSession.traineeName,
      session_key: assignedSession.sessionKey,
      expected_rebuttals: JSON.stringify(assignedSession.rebuttalKeys),
      objection_sequence: JSON.stringify(assignedSession.selectedObjections),
    },
  });

  const contractValidation = validateAssistantVariableContract(variableValues, "trainee");
  if (!contractValidation.ok) {
    await recordAlert({
      source: "api/vapi/trainee/session/start.contract",
      severity: "critical",
      message: "Assistant variable contract validation failed.",
      context: {
        sessionKey: assignedSession.sessionKey,
        traineeId: assignedSession.traineeId,
        orgId: assignedSession.orgId,
        missingKeys: contractValidation.missingKeys,
      },
    }).catch(() => null);

    return NextResponse.json(
      { error: "Training service configuration is invalid. Please contact support." },
      { status: 500 },
    );
  }

  await markAssignedSessionStarted({
    sessionKey: assignedSession.sessionKey,
    orgId,
    traineeId: assignedSession.traineeId,
    traineeClerkUserId: userId,
  });

  return NextResponse.json({
    sessionKey: assignedSession.sessionKey,
    assistantId: assignedSession.assistantId,
    publicKey,
    variableValues,
    metadata: {
      orgId: assignedSession.orgId,
      trainerId: assignedSession.trainerId,
      traineeId: assignedSession.traineeId,
      sessionKey: assignedSession.sessionKey,
      sequenceStage: variableValues.email_sequence_stage,
    },
  });
}
