import { NextResponse } from "next/server";
import { markSessionCompleted } from "@/lib/convex";

type EndSessionPayload = {
  endedAt?: number;
  durationSeconds?: number;
  finalScore?: number;
  toneStrikeCount?: number;
  appointmentSet?: boolean;
  sourceEventType?: string;
};

function isAuthorized(request: Request) {
  const expectedApiKey = process.env.SESSION_END_API_KEY;
  if (!expectedApiKey) {
    return true;
  }

  const provided = request.headers.get("x-api-key");
  return provided === expectedApiKey;
}

export async function POST(request: Request, context: { params: Promise<{ sessionKey: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionKey } = await context.params;
  if (!sessionKey) {
    return NextResponse.json({ error: "Session key is required." }, { status: 400 });
  }

  let payload: EndSessionPayload = {};
  try {
    payload = (await request.json()) as EndSessionPayload;
  } catch {
    payload = {};
  }

  try {
    const result = await markSessionCompleted({
      sessionKey,
      endedAt: payload.endedAt,
      sourceEventType: payload.sourceEventType ?? "api.session.end",
      durationSeconds: payload.durationSeconds,
      finalScore: payload.finalScore,
      toneStrikeCount: payload.toneStrikeCount,
      appointmentSet: payload.appointmentSet,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to end session.";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
