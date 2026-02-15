import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { storeTranscript } from "@/lib/convex";

type TranscriptPayload = {
  transcriptText?: string;
  mimeType?: string;
};

export async function POST(request: Request, context: { params: Promise<{ sessionKey: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Organization context is required." }, { status: 400 });
  }

  const { sessionKey } = await context.params;
  if (!sessionKey) {
    return NextResponse.json({ error: "Session key is required." }, { status: 400 });
  }

  let payload: TranscriptPayload;
  try {
    payload = (await request.json()) as TranscriptPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.transcriptText || payload.transcriptText.trim().length === 0) {
    return NextResponse.json({ error: "transcriptText is required." }, { status: 400 });
  }

  try {
    const result = await storeTranscript({
      sessionKey,
      orgId,
      userId,
      transcriptText: payload.transcriptText,
      mimeType: payload.mimeType,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to store transcript.";
    const status = /unauthorized/i.test(message) ? 403 : /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
