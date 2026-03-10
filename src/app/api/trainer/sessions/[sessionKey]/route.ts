import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { recoverTrainingSession } from "@/lib/convex";

type SessionRecoveryPayload = {
  action?: "mark_missed" | "mark_failed" | "create_replacement";
};

function toResponseStatus(message: string) {
  if (/not found/i.test(message)) {
    return 404;
  }
  if (/cannot/i.test(message) || /needs to open their dashboard/i.test(message) || /no longer has an active trainee/i.test(message)) {
    return 409;
  }
  if (/unauthorized/i.test(message)) {
    return 403;
  }
  return 500;
}

export async function POST(request: Request, context: { params: Promise<{ sessionKey: string }> }) {
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

  let payload: SessionRecoveryPayload = {};
  try {
    payload = (await request.json()) as SessionRecoveryPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.action) {
    return NextResponse.json({ error: "Action is required." }, { status: 400 });
  }

  try {
    const result = await recoverTrainingSession({
      sessionKey,
      orgId,
      trainerId: userId,
      action: payload.action,
    });

    return NextResponse.json({
      ok: true,
      action: result.action,
      sessionKey: result.sessionKey,
      replacementSessionKey: result.replacementSessionKey,
      status: result.status,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to recover the session.";
    return NextResponse.json({ error: message }, { status: toResponseStatus(message) });
  }
}
