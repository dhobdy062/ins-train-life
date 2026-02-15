import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { storeSessionRecording } from "@/lib/convex";

type RecordingPayload = {
  recordingBuffer?: string;
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

  let payload: RecordingPayload;
  try {
    payload = (await request.json()) as RecordingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.recordingBuffer || payload.recordingBuffer.trim().length === 0) {
    return NextResponse.json({ error: "recordingBuffer is required." }, { status: 400 });
  }

  try {
    const result = await storeSessionRecording({
      sessionKey,
      orgId,
      userId,
      recordingBuffer: payload.recordingBuffer,
      mimeType: payload.mimeType,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to store session recording.";
    const status = /unauthorized/i.test(message) ? 403 : /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
