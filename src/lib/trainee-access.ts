import { currentUser } from "@clerk/nextjs/server";
import {
  getIdentityMembershipByOrgAndUser,
  getTraineeByClerkUserId,
  getTraineeByOrgAndEmail,
  linkTraineeIdentity,
} from "@/lib/convex";
import { resolvePrimaryEmailAddress } from "@/lib/admin-portal";
import { syncIdentityForRequest } from "@/lib/identitySync";

type ResolvedTrainee = {
  traineeId: string;
  orgId: string;
  trainerId: string;
  clerkUserId: string | null;
  clerkMembershipId: string | null;
  name: string;
  email: string;
  difficultyLevel: string;
  numObjections: number;
  expectedRebuttals: string[];
  status: string;
  lastActiveAt: number | null;
};

export async function resolveAuthenticatedTrainee(args: {
  userId: string;
  orgId: string;
  source: string;
}) {
  await syncIdentityForRequest({
    userId: args.userId,
    orgId: args.orgId,
    source: args.source,
    failClosed: false,
  });

  const directMatch = await getTraineeByClerkUserId({
    orgId: args.orgId,
    clerkUserId: args.userId,
  }).catch(() => null);

  if (directMatch) {
    return {
      trainee: directMatch,
      resolution: "direct_clerk_match" as const,
      repaired: false,
    };
  }

  const user = await currentUser().catch(() => null);
  const primaryEmail = resolvePrimaryEmailAddress(user);
  if (!primaryEmail) {
    return {
      trainee: null,
      resolution: "missing_email" as const,
      repaired: false,
    };
  }

  const emailMatch = await getTraineeByOrgAndEmail({
    orgId: args.orgId,
    email: primaryEmail,
  }).catch(() => null);

  if (!emailMatch) {
    return {
      trainee: null,
      resolution: "not_found" as const,
      repaired: false,
    };
  }

  const membership = await getIdentityMembershipByOrgAndUser({
    clerkOrgId: args.orgId,
    clerkUserId: args.userId,
  }).catch(() => null);

  const needsRepair =
    emailMatch.clerkUserId !== args.userId ||
    (membership?.clerkMembershipId && emailMatch.clerkMembershipId !== membership.clerkMembershipId);

  if (!needsRepair) {
    return {
      trainee: emailMatch,
      resolution: "email_match" as const,
      repaired: false,
    };
  }

  await linkTraineeIdentity({
    traineeId: emailMatch.traineeId,
    orgId: args.orgId,
    clerkUserId: args.userId,
    clerkMembershipId: membership?.clerkMembershipId,
  });

  const repairedMatch = (await getTraineeByClerkUserId({
    orgId: args.orgId,
    clerkUserId: args.userId,
  }).catch(() => null)) as ResolvedTrainee | null;

  return {
    trainee: repairedMatch ?? {
      ...emailMatch,
      clerkUserId: args.userId,
      clerkMembershipId: membership?.clerkMembershipId ?? emailMatch.clerkMembershipId,
    },
    resolution: "email_match_repaired" as const,
    repaired: true,
  };
}
