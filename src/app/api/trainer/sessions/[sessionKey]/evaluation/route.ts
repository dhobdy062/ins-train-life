import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rerunTrainingSessionEvaluation } from "@/lib/convex";

function toResponseStatus(message: string) {
  if (/not found/i.test(message)) {
    return 404;
  }
  if (/unauthorized/i.test(message)) {
    return 403;
  }
  return 500;
}

export async function POST(_request: Request, context: { params: Promise<{ sessionKey: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to manage trainer sessions." }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Choose a team before managing sessions." }, { status: 400 });
  }

  const { sessionKey } = await context.params;
  if (!sessionKey) {
    return NextResponse.json({ error: "Session key is required." }, { status: 400 });
  }

  try {
    const result = await rerunTrainingSessionEvaluation({
      sessionKey,
      orgId,
      trainerId: userId,
    });
    return NextResponse.json({
      ok: true,
      found: result.found,
      evaluationId: result.evaluationId,
      status: result.status ?? null,
      attemptCount: result.attemptCount ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to re-run this evaluation.";
    return NextResponse.json({ error: message }, { status: toResponseStatus(message) });
  }
}
