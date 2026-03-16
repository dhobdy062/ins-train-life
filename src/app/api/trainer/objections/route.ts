import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrgTrainerObjectionConfig, upsertOrgTrainerObjectionConfig } from "@/lib/convex";
import {
  cloneObjectionLibrary,
  DEFAULT_REBUTTAL_GUIDES,
  normalizeObjectionLibrary,
  normalizeRebuttalGuides,
} from "@/lib/trainer-objections";

type SavePayload = {
  objectionLibrary?: unknown;
  rebuttalGuides?: unknown;
};

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Organization context is required." }, { status: 400 });
  }

  const config = await getOrgTrainerObjectionConfig({ orgId }).catch(() => null);

  return NextResponse.json({
    ok: true,
    objectionLibrary: config?.objectionLibrary ?? cloneObjectionLibrary(),
    rebuttalGuides: config?.rebuttalGuides ?? { ...DEFAULT_REBUTTAL_GUIDES },
    updatedAt: config?.updatedAt ?? null,
  });
}

export async function PUT(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Organization context is required." }, { status: 400 });
  }

  let payload: SavePayload = {};
  try {
    payload = (await request.json()) as SavePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const objectionLibrary = normalizeObjectionLibrary(payload.objectionLibrary);
  const rebuttalGuides = normalizeRebuttalGuides(payload.rebuttalGuides);

  const result = await upsertOrgTrainerObjectionConfig({
    orgId,
    updatedBy: userId,
    objectionLibrary,
    rebuttalGuides,
  });

  return NextResponse.json({
    ok: true,
    created: result.created,
    updatedAt: result.updatedAt,
    objectionLibrary,
    rebuttalGuides,
  });
}
