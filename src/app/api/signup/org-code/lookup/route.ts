import { NextResponse } from "next/server";
import { findActiveOrganizationsByClerkIdSuffix } from "@/lib/convex";
import { findClerkOrganizationsByIdSuffix } from "@/lib/clerk-org-join";
import { createOrgCodeToken } from "@/lib/org-code-token";

type LookupPayload = {
  orgCode?: string;
};

function normalizeOrgCode(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  let payload: LookupPayload = {};
  try {
    payload = (await request.json()) as LookupPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const orgCode = normalizeOrgCode(payload.orgCode);
  if (!/^[a-z0-9]{6}$/.test(orgCode)) {
    return NextResponse.json({ error: "Enter the last 6 characters of your organization ID." }, { status: 400 });
  }

  const convexMatches = await findActiveOrganizationsByClerkIdSuffix({ suffix: orgCode }).catch(() => []);
  const clerkMatches = await findClerkOrganizationsByIdSuffix(orgCode).catch((error) => {
    console.error("Org-code Clerk lookup failed:", error);
    return null;
  });

  const matches = clerkMatches ?? convexMatches;
  if (matches.length !== 1) {
    return NextResponse.json({ error: "We could not confirm that organization ID." }, { status: 404 });
  }

  const organization = matches[0];
  return NextResponse.json({
    ok: true,
    organizationName: organization.name,
    confirmationToken: createOrgCodeToken(organization.clerkOrgId),
  });
}
