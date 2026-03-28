import { NextResponse } from "next/server";
import { upsertDemoProspect } from "@/lib/convex";
import { verifyToken } from "@/lib/token";
import { provisionDemoProspectIdentity } from "@/lib/clerk-demo-prospects";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const invalidRedirectUrl = new URL("/#lead-form", request.url);

  if (!token) {
    return NextResponse.redirect(invalidRedirectUrl);
  }

  const secret = process.env.VERIFY_HMAC_SECRET;
  if (!secret) {
    return NextResponse.redirect(invalidRedirectUrl);
  }

  const payload = (() => {
    try {
      return verifyToken(token, secret);
    } catch {
      return null;
    }
  })();
  if (!payload) {
    return NextResponse.redirect(invalidRedirectUrl);
  }

  const name = payload.name?.trim();
  const organizationName = payload.agency?.trim();
  const normalizedEmail = payload.email.trim().toLowerCase();

  if (!name || !organizationName) {
    return NextResponse.redirect(invalidRedirectUrl);
  }

  const identity = await provisionDemoProspectIdentity({
    email: normalizedEmail,
    name,
    organizationName,
  });

  await upsertDemoProspect({
    clerkUserId: identity.clerkUserId,
    orgId: identity.clerkOrgId,
    email: identity.normalizedEmail,
    name,
    organizationName: identity.organizationName,
  });

  return NextResponse.redirect(identity.signInUrl);
}
