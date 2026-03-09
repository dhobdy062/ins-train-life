import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildExpectedRebuttalsFromAssigned, buildRebuttalGuideMapForAssigned, normalizeAssignedObjections } from "@/lib/assigned-sessions";
import { createTrainingSession, getOrgTrainerObjectionConfig, getTraineeProfileById } from "@/lib/convex";
import { type DifficultyLevel, isDifficultyLevel } from "@/lib/training-profile";
import { DEFAULT_OBJECTION_LIBRARY, DEFAULT_REBUTTAL_GUIDES } from "@/lib/trainer-objections";
import { resolveLifeAssistantId } from "@/lib/vapi-assistants";

type CreateAssignedSessionPayload = {
  traineeId?: string;
  difficulty?: string;
  selectedObjections?: Array<{
    text?: string;
    rebuttalType?: string;
  }>;
};

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Organization context is required." }, { status: 400 });
  }

  let payload: CreateAssignedSessionPayload = {};
  try {
    payload = (await request.json()) as CreateAssignedSessionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.traineeId) {
    return NextResponse.json({ error: "traineeId is required." }, { status: 400 });
  }

  const trainee = await getTraineeProfileById({
    traineeId: payload.traineeId,
    orgId,
  });
  if (!trainee) {
    return NextResponse.json({ error: "Trainee not found." }, { status: 404 });
  }
  if (!trainee.clerkUserId) {
    return NextResponse.json({ error: "Trainee is not linked to Clerk yet." }, { status: 409 });
  }

  const fallbackDifficulty =
    typeof trainee.difficultyLevel === "string" && isDifficultyLevel(trainee.difficultyLevel)
      ? trainee.difficultyLevel
      : "D2";
  const difficulty: DifficultyLevel =
    typeof payload.difficulty === "string" && isDifficultyLevel(payload.difficulty) ? payload.difficulty : fallbackDifficulty;

  const selectedObjections = normalizeAssignedObjections(
    Array.isArray(payload.selectedObjections)
      ? payload.selectedObjections.map((row) => ({
          text: row.text ?? "",
          rebuttalType: row.rebuttalType ?? "",
        }))
      : [],
  );

  if (selectedObjections.length === 0) {
    return NextResponse.json({ error: "Select at least one objection." }, { status: 400 });
  }

  const objectionConfig = await getOrgTrainerObjectionConfig({ orgId }).catch(() => null);
  const objectionLibrary = objectionConfig?.objectionLibrary?.[difficulty] ?? DEFAULT_OBJECTION_LIBRARY[difficulty];
  const validKeys = new Set(objectionLibrary.map((row) => `${row.text}::${row.rebuttalType}`));
  const invalidSelection = selectedObjections.some((row) => !validKeys.has(`${row.text}::${row.rebuttalType}`));
  if (invalidSelection) {
    return NextResponse.json({ error: "Selected objections are out of sync with the current library." }, { status: 400 });
  }

  const expectedRebuttals = buildExpectedRebuttalsFromAssigned(selectedObjections);
  const rebuttalGuideMap = buildRebuttalGuideMapForAssigned(
    selectedObjections,
    objectionConfig?.rebuttalGuides ?? DEFAULT_REBUTTAL_GUIDES,
  );

  const session = await createTrainingSession({
    orgId,
    trainerId: userId,
    traineeId: trainee.traineeId,
    traineeClerkUserId: trainee.clerkUserId,
    assistantId: resolveLifeAssistantId(difficulty),
    difficulty,
    objectionsRequired: selectedObjections.length,
    rebuttalKeys: expectedRebuttals,
    selectedObjections,
    rebuttalGuideMap,
    channel: "web",
    initialStatus: "assigned",
    profileSnapshot: {
      difficultyLevel: difficulty,
      objectionsRequired: selectedObjections.length,
      expectedRebuttals,
    },
  });

  return NextResponse.json({
    ok: true,
    sessionKey: session.sessionKey,
    traineeId: trainee.traineeId,
    traineeName: trainee.name,
    difficulty,
    objectionsRequired: selectedObjections.length,
    selectedObjections,
  });
}
