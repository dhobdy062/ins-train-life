import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrgTrainerTrainingPlans, upsertOrgTrainerTrainingPlans } from "@/lib/convex";
import { buildDefaultTrainingPlans, normalizeTrainerTrainingPlans } from "@/lib/trainer-plans";

type SavePayload = {
  plans?: unknown;
};

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Organization context is required." }, { status: 400 });
  }

  const config = await getOrgTrainerTrainingPlans({ orgId }).catch(() => null);
  const plans = normalizeTrainerTrainingPlans(config?.plans ?? buildDefaultTrainingPlans());

  return NextResponse.json({
    ok: true,
    plans,
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

  const plans = normalizeTrainerTrainingPlans(payload.plans);
  const result = await upsertOrgTrainerTrainingPlans({
    orgId,
    updatedBy: userId,
    plans,
  });

  return NextResponse.json({
    ok: true,
    created: result.created,
    updatedAt: result.updatedAt,
    plans,
  });
}
