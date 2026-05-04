import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildExpectedRebuttalsFromAssigned, buildRebuttalGuideMapForAssigned, normalizeAssignedObjections } from "@/lib/assigned-sessions";
import { createTrainingSession, getOrgTrainerObjectionConfig, getTraineeProfileById } from "@/lib/convex";
import { type DifficultyLevel, isDifficultyLevel } from "@/lib/training-profile";
import {
  DEFAULT_OBJECTION_LIBRARY,
  DEFAULT_REBUTTAL_GUIDES,
  getDefaultObjectionLibraryForProduct,
  getDefaultRebuttalGuidesForProduct,
} from "@/lib/trainer-objections";
import {
  getTrainingProductConfig,
  isProductDifficultyAllowed,
  isTrainingProductType,
  normalizeTrainingProductType,
  type TrainingProductType,
} from "@/lib/training-products";
import { resolveTrainingAssistantId } from "@/lib/vapi-assistants";

type CreateAssignedSessionPayload = {
  traineeId?: string;
  productType?: string;
  difficulty?: string;
  selectedObjections?: Array<{
    text?: string;
    rebuttalType?: string;
  }>;
};

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to assign sessions." }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Choose a team before assigning sessions." }, { status: 400 });
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

  if (payload.productType !== undefined && !isTrainingProductType(payload.productType)) {
    return NextResponse.json({ error: "Invalid product type." }, { status: 400 });
  }

  const trainee = await getTraineeProfileById({
    traineeId: payload.traineeId,
    orgId,
  });
  if (!trainee) {
    return NextResponse.json({ error: "Trainee not found." }, { status: 404 });
  }
  if (!trainee.clerkUserId) {
    return NextResponse.json(
      { error: "This trainee's sign-in access is still syncing. Ask them to open their dashboard once, then retry." },
      { status: 409 },
    );
  }

  const productType: TrainingProductType = normalizeTrainingProductType(payload.productType);
  const productConfig = getTrainingProductConfig(productType);
  const fallbackDifficulty =
    typeof trainee.difficultyLevel === "string" && isDifficultyLevel(trainee.difficultyLevel)
      ? trainee.difficultyLevel
      : "D2";
  const difficulty: DifficultyLevel =
    typeof payload.difficulty === "string" && isDifficultyLevel(payload.difficulty) ? payload.difficulty : fallbackDifficulty;

  if (!isProductDifficultyAllowed(productType, difficulty)) {
    return NextResponse.json({ error: `${difficulty} is not available for ${productConfig.productLabel}.` }, { status: 400 });
  }

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
  const productDefaultLibrary = getDefaultObjectionLibraryForProduct(productType);
  const objectionLibrary =
    productType === "life"
      ? objectionConfig?.objectionLibrary?.[difficulty] ?? DEFAULT_OBJECTION_LIBRARY[difficulty]
      : productDefaultLibrary[difficulty];
  const validKeys = new Set(objectionLibrary.map((row) => `${row.text}::${row.rebuttalType}`));
  const invalidSelection = selectedObjections.some((row) => !validKeys.has(`${row.text}::${row.rebuttalType}`));
  if (invalidSelection) {
    return NextResponse.json({ error: "Selected objections are out of sync with the current library." }, { status: 400 });
  }

  try {
    const expectedRebuttals = buildExpectedRebuttalsFromAssigned(selectedObjections);
    const productDefaultGuides = getDefaultRebuttalGuidesForProduct(productType);
    const rebuttalGuideMap = buildRebuttalGuideMapForAssigned(
      selectedObjections,
      productType === "life" ? objectionConfig?.rebuttalGuides ?? DEFAULT_REBUTTAL_GUIDES : productDefaultGuides,
    );
    const assistantId = resolveTrainingAssistantId(productType, difficulty);

    const session = await createTrainingSession({
      orgId,
      trainerId: userId,
      productType,
      traineeId: trainee.traineeId,
      traineeClerkUserId: trainee.clerkUserId,
      assistantId,
      difficulty,
      objectionsRequired: selectedObjections.length,
      rebuttalKeys: expectedRebuttals,
      selectedObjections,
      rebuttalGuideMap,
      channel: "web",
      initialStatus: "assigned",
      profileSnapshot: {
        productType,
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
      productType,
      productLabel: productConfig.productLabel,
      difficulty,
      objectionsRequired: selectedObjections.length,
      selectedObjections,
    });
  } catch (err: unknown) {
    console.error("Session creation error:", err);
    const message = err instanceof Error ? err.message : "Internal server error during session creation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
