import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateSelfTraineeProfile } from "@/lib/convex";
import { ensureClerkOrganizationMembership } from "@/lib/clerk-org-join";
import { hashInviteToken } from "@/lib/identity-link";
import { verifyOrgCodeToken } from "@/lib/org-code-token";
import { buildExpectedRebuttals } from "@/lib/training-profile";

function buildInviteTokenHash(orgId: string, userId: string) {
  return hashInviteToken(`org-code:${orgId}:${userId}`);
}

export async function GET(request: Request) {
  const { userId } = await auth();
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const redirectUrl = new URL("/workspace/select-organization", url.origin);
  redirectUrl.searchParams.set("redirect_url", "/dashboard/trainee");

  if (!userId) {
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("redirect_url", `/api/signup/org-code/complete?token=${encodeURIComponent(token)}`);
    return NextResponse.redirect(signInUrl);
  }

  const verified = verifyOrgCodeToken(token);
  if (!verified) {
    redirectUrl.searchParams.set("join", "invalid");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const membership = await ensureClerkOrganizationMembership({
      orgId: verified.orgId,
      userId,
      role: "org:trainee",
    });
    const expectedRebuttals = buildExpectedRebuttals("D2", 3);

    await getOrCreateSelfTraineeProfile({
      orgId: verified.orgId,
      clerkUserId: userId,
      clerkMembershipId: membership.clerkMembershipId,
      name: membership.user.name,
      email: membership.user.email,
      availableProductTypes: ["life", "medicare_lead", "medicare_event"],
      difficultyLevel: "D2",
      numObjections: 3,
      expectedRebuttals,
      inviteTokenHash: buildInviteTokenHash(verified.orgId, userId),
    });

    redirectUrl.searchParams.set("joined", "1");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Org-code join failed:", error);
    redirectUrl.searchParams.set("join", "failed");
    return NextResponse.redirect(redirectUrl);
  }
}
