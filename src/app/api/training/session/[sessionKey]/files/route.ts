import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteSessionWithArtifacts, getSessionWithFiles } from "@/lib/convex";

export async function GET(_request: Request, context: { params: Promise<{ sessionKey: string }> }) {
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

  try {
    const result = await getSessionWithFiles({ sessionKey, orgId, userId });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load session files.";
    const status = /unauthorized/i.test(message) ? 403 : /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ sessionKey: string }> }) {
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

  try {
    const result = await deleteSessionWithArtifacts({ sessionKey, orgId, userId });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete session artifacts.";
    const status = /unauthorized/i.test(message) ? 403 : /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
